import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, Play, Clock, History, Bookmark, User, ChevronLeft, Download, Trash2, WifiOff } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { IndexedDBService } from '../../../../core/services/indexed-db.service';
import { VideoDownloadService } from '../../../../core/services/video-download.service';

@Component({
  selector: 'app-wetube-library',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="library-page w-full min-h-screen bg-[#0f0f0f] text-white p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24">
      <div class="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        <!-- Main Content (History & Saved) -->
        <div class="flex-1 space-y-10">
          
          <!-- History Section -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2 text-xl font-bold">
                <lucide-icon [img]="History" size="24"></lucide-icon>
                <h2>سجل المشاهدة</h2>
              </div>
              <button class="text-indigo-400 hover:text-indigo-300 text-sm font-medium">عرض الكل</button>
            </div>
            
            @if (history().length === 0) {
              <div class="text-gray-400 py-8 text-center bg-gray-900 rounded-xl">لا يوجد فيديوهات في السجل.</div>
            } @else {
              <div class="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                @for (item of history().slice(0, 10); track item.videoId) {
                  <div class="w-64 shrink-0 snap-start group cursor-pointer" (click)="playVideo(item.videoId)">
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

          <!-- Saved Videos Section -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2 text-xl font-bold">
                <lucide-icon [img]="Bookmark" size="24"></lucide-icon>
                <h2>الفيديوهات المحفوظة</h2>
              </div>
              <button class="text-indigo-400 hover:text-indigo-300 text-sm font-medium">عرض الكل</button>
            </div>
            
            @if (savedVideos().length === 0) {
              <div class="text-gray-400 py-8 text-center bg-gray-900 rounded-xl">لم تقم بحفظ أي فيديو بعد.</div>
            } @else {
              <div class="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                @for (item of savedVideos(); track item.videoId) {
                  <div class="w-64 shrink-0 snap-start group cursor-pointer" (click)="playVideo(item.videoId)">
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
        </div>

        <!-- Sidebar Profile & Stats -->
        <div class="w-full lg:w-80 shrink-0">
          <div class="bg-[#181818] rounded-2xl p-6 sticky top-24">
            <div class="flex flex-col items-center text-center border-b border-gray-800 pb-6 mb-6">
              <div class="w-24 h-24 rounded-full bg-indigo-900 border-2 border-indigo-500 mb-4 flex items-center justify-center overflow-hidden">
                <lucide-icon [img]="User" size="40" class="text-indigo-300"></lucide-icon>
              </div>
              <h2 class="text-lg font-bold">المستخدم الحالي</h2>
              <p class="text-sm text-gray-400">@user_xyz</p>
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
  private idb = inject(IndexedDBService);
  private router = inject(Router);
  
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
      const savedData = await this.idb.getAll('saved_videos');
      this.savedVideos.set(savedData || []);

      // Load Offline Downloads
      const dlData = await this.downloadSvc.getAllCachedMeta();
      this.downloads.set(dlData.sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0)));
      
    } catch (e) {
      console.error('Failed to load library data from IndexedDB', e);
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
