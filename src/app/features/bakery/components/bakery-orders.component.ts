import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BakeryService, BakeryOrder } from '../../../core/services/bakery.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-bakery-orders',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <div class="flex flex-col h-full bg-surface-container-lowest">
      <div class="p-4 border-b border-surface-container-high bg-surface-container-low shrink-0">
        <h3 class="font-bold text-sm text-on-surface">طلباتي السابقة والحالية</h3>
        <p class="text-[10px] text-on-surface-variant mt-1">تتبع طلبك لتعرف متى يكون ساخناً وجاهزاً</p>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div *ngIf="bakery.userOrders().length === 0" class="h-full flex flex-col items-center justify-center text-center opacity-60">
          <svg lucideIcon="receipt" class="w-10 h-10 mb-2 text-on-surface-variant"></svg>
          <p class="text-xs font-medium">لا توجد طلبات سابقة</p>
        </div>

        <div *ngFor="let order of bakery.userOrders()" class="bg-white dark:bg-surface-container rounded-2xl p-4 border border-surface-container-high shadow-sm relative overflow-hidden">
          
          <!-- Background Status Glow -->
          <div class="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-xl" [ngClass]="getStatusColor(order.status)"></div>

          <div class="flex justify-between items-start mb-3 relative z-10">
            <div>
              <div class="text-[10px] text-on-surface-variant mb-1">{{ order.createdAt | date:'short' }}</div>
              <div class="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <svg [lucideIcon]="getStatusIcon(order.status)" class="w-4 h-4" [ngClass]="getStatusTextColor(order.status)"></svg>
                {{ getStatusText(order.status) }}
              </div>
            </div>
            <div class="text-left">
              <div class="font-black text-sm text-amber-600">{{ order.totalAmount }} <span class="text-[9px]">EGC</span></div>
              <div class="text-[9px] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full mt-1">{{ order.paymentMethod === 'cash' ? 'دفع عند الاستلام' : 'دفع إلكتروني' }}</div>
            </div>
          </div>

          <!-- Progress Bar (Only for active orders) -->
          <div *ngIf="['pending', 'preparing', 'ready'].includes(order.status)" class="mb-4">
            <div class="flex justify-between text-[9px] font-bold text-on-surface-variant mb-1.5 px-1">
              <span [class.text-amber-600]="order.status === 'pending'">تم الاستلام</span>
              <span [class.text-amber-600]="order.status === 'preparing'">جاري الخبز</span>
              <span [class.text-emerald-500]="order.status === 'ready'">جاهز وساخن!</span>
            </div>
            <div class="h-1.5 bg-surface-container-high rounded-full overflow-hidden flex">
              <div class="h-full transition-all duration-1000 ease-in-out" 
                   [ngClass]="getProgressBarColor(order.status)"
                   [style.width]="getProgressWidth(order.status)"></div>
            </div>
            <div *ngIf="order.status === 'preparing' && order.pickupTimeEstimates" class="text-[9px] text-center mt-2 font-bold text-amber-600 animate-pulse flex justify-center items-center gap-1">
              <svg lucideIcon="timer" class="w-3 h-3"></svg>
              وقت الاستلام المتوقع: {{ order.pickupTimeEstimates }}
            </div>
          </div>

          <!-- Order Items -->
          <div class="space-y-1.5 mt-3 pt-3 border-t border-surface-container-high border-dashed relative z-10">
            <div *ngFor="let item of order.items" class="flex justify-between items-center text-xs">
              <div class="flex items-center gap-2">
                <span class="font-bold text-on-surface-variant bg-surface-container-low w-5 h-5 flex items-center justify-center rounded">{{ item.quantity }}x</span>
                <span class="text-on-surface font-medium truncate max-w-[140px]">{{ item.product.name }}</span>
              </div>
              <span class="font-bold text-on-surface-variant">{{ item.product.price * item.quantity }}</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
  `]
})
export class BakeryOrdersComponent {
  bakery = inject(BakeryService);

  getStatusText(status: string): string {
    const map: any = {
      pending: 'بانتظار التأكيد',
      preparing: 'جاري الخبز والتحضير',
      ready: 'طلبك جاهز وساخن!',
      completed: 'مكتمل (تم الاستلام)',
      cancelled: 'ملغي'
    };
    return map[status] || status;
  }

  getStatusIcon(status: string): string {
    const map: any = {
      pending: 'clock',
      preparing: 'flame',
      ready: 'check-circle-2',
      completed: 'check-square',
      cancelled: 'x-circle'
    };
    return map[status] || 'info';
  }

  getStatusColor(status: string): string {
    if (status === 'ready' || status === 'completed') return 'bg-emerald-500';
    if (status === 'preparing') return 'bg-orange-500';
    if (status === 'cancelled') return 'bg-red-500';
    return 'bg-amber-500';
  }

  getStatusTextColor(status: string): string {
    if (status === 'ready' || status === 'completed') return 'text-emerald-500';
    if (status === 'preparing') return 'text-orange-500';
    if (status === 'cancelled') return 'text-red-500';
    return 'text-amber-500';
  }

  getProgressBarColor(status: string): string {
    if (status === 'ready') return 'bg-emerald-500';
    return 'bg-amber-500';
  }

  getProgressWidth(status: string): string {
    if (status === 'pending') return '33%';
    if (status === 'preparing') return '66%';
    if (status === 'ready') return '100%';
    return '0%';
  }
}
