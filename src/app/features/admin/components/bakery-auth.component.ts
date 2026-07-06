import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';
import { BakeryAdminComponent } from './bakery-admin.component';
import { LucideDynamicIcon } from '@lucide/angular';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bakery-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, BakeryAdminComponent, LucideDynamicIcon, RouterModule],
  template: `
    <!-- If Authenticated, show the Admin Dashboard -->
    <app-bakery-admin *ngIf="isAuthenticated()"></app-bakery-admin>

    <!-- If NOT Authenticated, show Login Screen -->
    <div *ngIf="!isAuthenticated()" class="h-screen w-full flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-orange-800/20" dir="rtl">
      
      <div class="bg-surface-container-low border border-surface-container-high rounded-3xl p-8 w-full max-w-md shadow-2xl backdrop-blur-xl">
        <div class="flex flex-col items-center text-center mb-8">
          <div class="w-16 h-16 bg-amber-500/20 text-amber-500 flex items-center justify-center rounded-2xl mb-4">
            <svg lucideIcon="croissant" class="w-8 h-8"></svg>
          </div>
          <h2 class="text-2xl font-black text-on-surface mb-1">تسجيل الدخول</h2>
          <p class="text-sm text-on-surface-variant font-medium">نظام إدارة مخبز عبّاد الرحمن</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-on-surface-variant mb-2">اسم المستخدم</label>
            <input type="text" [(ngModel)]="username" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-amber-500 transition-colors" placeholder="أدخل اسم المستخدم">
          </div>

          <div>
            <label class="block text-sm font-bold text-on-surface-variant mb-2">كلمة المرور</label>
            <input type="password" [(ngModel)]="password" (keydown.enter)="login()" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-amber-500 transition-colors" placeholder="أدخل كلمة المرور">
          </div>

          <button (click)="login()" class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-amber-600/20 mt-4 flex items-center justify-center gap-2">
            تسجيل الدخول
          </button>
        </div>
        
        <div class="mt-6 text-center">
          <a routerLink="/bakery" class="text-xs text-amber-600 font-bold hover:underline cursor-pointer">العودة إلى واجهة المخبز</a>
        </div>
      </div>
    </div>
  `
})
export class BakeryAuthComponent {
  toast = inject(ToastService);
  isAuthenticated = signal(false);
  username = '';
  password = '';

  constructor() {
    if (sessionStorage.getItem('bakery_admin_auth') === 'true') {
      this.isAuthenticated.set(true);
    }
  }

  login() {
    if (this.username === 'Mohamed Eltoor' && this.password === 'H@f3_g-n7=Servants_of_the_Most_Gracious') {
      sessionStorage.setItem('bakery_admin_auth', 'true');
      this.isAuthenticated.set(true);
      this.toast.show('مرحباً بك في نظام الإدارة يا محمد الطور', 'success');
    } else {
      this.toast.show('بيانات الدخول غير صحيحة', 'error');
    }
  }
}
