import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-card group cursor-pointer relative flex flex-col gap-3">
      <!-- Thumbnail Wrapper -->
      <div class="thumbnail-wrapper relative w-full rounded-xl overflow-hidden bg-slate-900 border border-white/5 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-indigo-500/10 group-hover:-translate-y-1 aspect-video">
        <img crossorigin="anonymous" [src]="video().thumbnail || 'assets/placeholder.jpg'" [alt]="video().title" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
        
        @if (video().duration) {
          <span class="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[10px] font-bold">{{ video().duration }}</span>
        }
      </div>

      <!-- Info Section -->
      <div class="video-info flex gap-3 items-start px-1">
        @if (video().channelAvatar) {
          <img crossorigin="anonymous" [src]="video().channelAvatar" class="w-9 h-9 rounded-full bg-slate-800 border border-white/10 shrink-0 object-cover mt-0.5" [alt]="video().author">
        } @else {
          <div class="w-9 h-9 rounded-full bg-slate-800 shrink-0 mt-0.5"></div>
        }
        
        <div class="info-text flex flex-col min-w-0 flex-1">
          <h3 class="text-sm font-bold text-white leading-snug line-clamp-2 mb-1 group-hover:text-indigo-400 transition-colors">{{ video().title }}</h3>
          <p class="text-xs text-slate-400 font-medium truncate hover:text-slate-300">{{ video().author }}</p>
          <p class="text-[11px] text-slate-500 font-medium mt-0.5">
            @if (video().views) { <span>{{ video().views }} مشاهدة</span> }
            @if (video().time) { <span> • {{ video().time }}</span> }
          </p>
        </div>
      </div>
    </div>
  `
})
export class VideoCardComponent {
  video = input.required<any>();
}
