import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (type() === 'banner') {
      <div class="w-full h-48 md:h-64 lg:h-80 bg-gray-800 animate-pulse"></div>
    } @else if (type() === 'avatar') {
      <div class="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-700 animate-pulse border-4 border-[#0f0f0f] shrink-0"></div>
    } @else if (type() === 'title') {
      <div class="h-8 bg-gray-700 rounded w-1/3 animate-pulse mb-2"></div>
    } @else if (type() === 'text') {
      <div class="space-y-2">
        <div class="h-4 bg-gray-800 rounded w-1/4 animate-pulse"></div>
        <div class="h-4 bg-gray-800 rounded w-1/2 animate-pulse"></div>
      </div>
    } @else if (type() === 'video-card') {
      <div class="flex flex-col gap-3">
        <div class="aspect-video w-full bg-gray-800 rounded-xl animate-pulse"></div>
        <div class="flex gap-3">
          <div class="w-10 h-10 rounded-full bg-gray-700 animate-pulse shrink-0"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="h-4 bg-gray-700 rounded w-5/6 animate-pulse"></div>
            <div class="h-4 bg-gray-700 rounded w-1/2 animate-pulse"></div>
            <div class="h-3 bg-gray-800 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    }
  `
})
export class SkeletonLoaderComponent {
  type = input.required<'banner' | 'avatar' | 'title' | 'text' | 'video-card'>();
}
