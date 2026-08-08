import { Component, inject, OnInit, OnDestroy, signal, HostListener, ViewChild, ElementRef, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShortPlayerComponent } from './short-player.component';
import { ShortsQueueService, ShortVideo } from '../../../../core/services/shorts-queue.service';
import { SidebarService } from '../../../../core/sidebar.service';

@Component({
  selector: 'app-halaltube-shorts',
  standalone: true,
  imports: [CommonModule, ShortPlayerComponent],
  template: `
    <div class="shorts-page-wrapper w-full h-[calc(100vh-64px)] bg-black overflow-hidden flex justify-center">
      <!-- Snap Container -->
      <div 
        #scrollContainer
        class="shorts-snap-container w-full max-w-md h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory hide-scrollbar relative"
        (scroll)="onScroll()"
      >
        @if (isLoading()) {
          <div class="absolute inset-0 flex flex-col items-center justify-center bg-black z-50">
            <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-white font-bold">جاري تجهيز الفيديوهات...</p>
          </div>
        }

        <!-- Render all wrappers for snap scrolling, but only pass isActive to the ones near the current index -->
        <div class="relative w-full" [style.height.px]="queue().length * containerHeight()">
          @for (video of queue(); track video.id; let i = $index) {
            <div 
              class="absolute w-full snap-start"
              [style.height.px]="containerHeight()"
              [style.top.px]="i * containerHeight()"
            >
              <app-short-player 
                [video]="video" 
                [isActive]="Math.abs(i - currentIndex()) <= 1"
              ></app-short-player>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hide-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class halaltubeShortsComponent implements OnInit, OnDestroy {
  private queueService = inject(ShortsQueueService);
  private sidebar = inject(SidebarService);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLElement>;

  queue = signal<ShortVideo[]>([]);
  currentIndex = signal<number>(0);
  isLoading = signal<boolean>(true);
  containerHeight = signal<number>(window.innerHeight - 64); // Assuming topbar is 64px

  Math = Math;

  ngOnInit() {
    this.sidebar.setPosition('right'); // Move to opposite side (right) for shorts
    this.sidebar.setCollapsed(true); 
    this.loadQueue();
  }

  ngOnDestroy() {
    this.sidebar.setPosition('left'); // Restore default position
  }

  @HostListener('window:resize')
  onResize() {
    if (this.scrollContainer?.nativeElement) {
      this.containerHeight.set(this.scrollContainer.nativeElement.clientHeight);
    } else {
      this.containerHeight.set(window.innerHeight - 64);
    }
  }

  async loadQueue() {
    this.isLoading.set(true);
    const newQueue = await this.queueService.generateQueue();
    this.queue.set(newQueue);
    this.isLoading.set(false);
    
    // Defer height calculation until after view init
    setTimeout(() => {
      this.onResize();
    }, 0);
  }

  onScroll() {
    if (!this.scrollContainer?.nativeElement) return;
    
    const scrollTop = this.scrollContainer.nativeElement.scrollTop;
    const height = this.containerHeight();
    
    // Calculate current index based on scroll position
    const index = Math.round(scrollTop / height);
    
    if (index !== this.currentIndex()) {
      this.currentIndex.set(index);
      
      // Infinite scroll trigger: load more when reaching the end
      if (index >= this.queue().length - 3) {
        this.loadMore();
      }
    }
  }

  private isFetchingMore = false;
  private async loadMore() {
    if (this.isFetchingMore) return;
    this.isFetchingMore = true;
    
    const more = await this.queueService.generateQueue();
    // Filter duplicates just in case
    const currentIds = new Set(this.queue().map(v => v.id));
    const uniqueMore = more.filter(v => !currentIds.has(v.id));
    
    this.queue.update(q => [...q, ...uniqueMore]);
    this.isFetchingMore = false;
  }
}
