import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Upload, User, Menu, Bell } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';

@Component({
  selector: 'app-wetube-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <header class="sticky top-0 z-50 w-full bg-slate-950/70 backdrop-blur-md border-b border-white/5 px-4 h-16 flex items-center justify-between" dir="rtl">
      <!-- Logo & Menu -->
      <div class="flex items-center gap-4">
        <button class="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white">
          <lucide-icon [img]="Menu" class="w-5 h-5"></lucide-icon>
        </button>
        <div class="flex items-center gap-1 cursor-pointer">
          <div class="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-black text-xl tracking-tighter">W</div>
          <h1 class="text-xl font-bold text-white tracking-tight hidden sm:block">WeTube</h1>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="flex-1 max-w-2xl px-4 flex justify-center">
        <div class="flex w-full max-w-lg items-center bg-slate-900 border border-white/10 rounded-full overflow-hidden focus-within:border-indigo-500 focus-within:shadow-[0_0_0_1px_rgba(99,102,241,1)] transition-all">
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (keyup.enter)="onSearch()" 
            placeholder="بحث..."
            class="flex-1 bg-transparent border-none text-white px-4 py-2 text-sm focus:outline-none focus:ring-0 placeholder-slate-500"
          >
          <button 
            (click)="onSearch()"
            class="px-5 py-2.5 bg-white/5 hover:bg-white/10 border-r border-white/10 transition-colors text-slate-300 hover:text-white flex items-center justify-center"
          >
            <lucide-icon [img]="Search" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
      </div>

      <!-- User Actions -->
      <div class="flex items-center gap-2 sm:gap-4">
        <button class="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors border border-white/5">
          <lucide-icon [img]="Upload" class="w-4 h-4"></lucide-icon>
          <span>إنشاء</span>
        </button>
        <button class="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white relative">
          <lucide-icon [img]="Bell" class="w-5 h-5"></lucide-icon>
          <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-950"></span>
        </button>
        <button class="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-colors text-white border border-indigo-400/30 overflow-hidden ml-2">
          <lucide-icon [img]="User" class="w-4 h-4"></lucide-icon>
        </button>
      </div>
    </header>
  `
})
export class WeTubeTopbarComponent {
  Search = Search;
  Upload = Upload;
  User = User;
  Menu = Menu;
  Bell = Bell;
  
  searchQuery = '';
  wetube = inject(WeTubeService);

  onSearch() {
    this.wetube.search(this.searchQuery);
  }
}
