import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineQueueService } from '../../../core/services/offline-queue.service';
import { LucideAngularModule, CloudUpload, CloudRain, CheckCircle, AlertCircle, Loader2 } from 'lucide-angular';

@Component({
  selector: 'app-sync-monitor',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (offlineQueue.activeSyncs().length > 0) {
      <div class="fixed bottom-6 left-6 z-[100] w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto transform transition-all">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-slate-950/50 border-b border-white/5">
          <div class="flex items-center gap-2">
            <lucide-icon [img]="CloudUpload" class="w-5 h-5 text-indigo-400"></lucide-icon>
            <span class="text-sm font-bold text-white">مدير المزامنة</span>
          </div>
          <span class="text-xs font-bold text-slate-400">{{ offlineQueue.activeSyncs().length }} عناصر</span>
        </div>

        <!-- Items -->
        <div class="max-h-60 overflow-y-auto hide-scrollbar p-2 flex flex-col gap-2">
          @for (req of offlineQueue.activeSyncs(); track req.id) {
            <div class="bg-white/5 rounded-xl p-3 flex flex-col gap-2 border border-white/5">
              
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 truncate">
                  @switch (req.status) {
                    @case ('pending') { <lucide-icon [img]="CloudRain" class="w-4 h-4 text-slate-400 shrink-0"></lucide-icon> }
                    @case ('syncing') { <lucide-icon [img]="Loader2" class="w-4 h-4 text-indigo-400 shrink-0 animate-spin"></lucide-icon> }
                    @case ('success') { <lucide-icon [img]="CheckCircle" class="w-4 h-4 text-emerald-400 shrink-0"></lucide-icon> }
                    @case ('error') { <lucide-icon [img]="AlertCircle" class="w-4 h-4 text-red-400 shrink-0"></lucide-icon> }
                  }
                  <span class="text-xs font-semibold text-slate-300 truncate" dir="ltr">{{ req.url.split('/').pop() || 'Uploading Data...' }}</span>
                </div>
                
                <span class="text-[10px] font-bold"
                      [ngClass]="{
                        'text-slate-400': req.status === 'pending',
                        'text-indigo-400': req.status === 'syncing',
                        'text-emerald-400': req.status === 'success',
                        'text-red-400': req.status === 'error'
                      }">
                  @switch (req.status) {
                    @case ('pending') { في الانتظار }
                    @case ('syncing') { جاري الرفع... }
                    @case ('success') { تم بنجاح }
                    @case ('error') { فشل }
                  }
                </span>
              </div>

              <!-- Progress Bar -->
              @if (req.status === 'syncing' || req.status === 'success') {
                <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-300 ease-out"
                       [ngClass]="req.status === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'"
                       [style.width.%]="req.progress || 0"></div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncMonitorComponent {
  offlineQueue = inject(OfflineQueueService);
  CloudUpload = CloudUpload;
  CloudRain = CloudRain;
  CheckCircle = CheckCircle;
  AlertCircle = AlertCircle;
  Loader2 = Loader2;
}
