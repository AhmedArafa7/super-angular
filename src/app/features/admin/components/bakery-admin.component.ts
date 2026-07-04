import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BakeryService, BakeryOrder } from '../../../core/services/bakery.service';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-bakery-admin',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <div class="h-full flex flex-col p-6 font-sans text-right" dir="rtl">
      
      <!-- Header -->
      <div class="flex justify-between items-center mb-6 bg-surface-container-low p-4 rounded-2xl border border-surface-container-high">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-amber-500/20 text-amber-500 flex items-center justify-center rounded-xl">
            <svg lucideIcon="croissant" class="w-6 h-6"></svg>
          </div>
          <div>
            <h2 class="text-xl font-black text-on-surface">إدارة المخبز</h2>
            <p class="text-sm font-medium text-on-surface-variant">الطلبات الحية الواردة من العملاء</p>
          </div>
        </div>
        
        <div class="flex gap-2">
          <div class="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span class="text-xs font-bold text-amber-600">نشط يتلقى الطلبات</span>
          </div>
        </div>
      </div>

      <!-- Live Orders Grid -->
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div *ngIf="bakery.allActiveOrders().length === 0" class="flex flex-col items-center justify-center h-full opacity-60">
          <svg lucideIcon="coffee" class="w-16 h-16 text-on-surface-variant mb-4"></svg>
          <p class="text-lg font-bold text-on-surface">لا توجد طلبات نشطة الآن</p>
          <p class="text-sm font-medium text-on-surface-variant">يوم هادئ حتى اللحظة!</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let order of bakery.allActiveOrders()" class="bg-surface-container-low rounded-3xl p-5 border border-surface-container-high shadow-lg relative overflow-hidden flex flex-col">
            
            <!-- Glow depending on status -->
            <div class="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none" [ngClass]="getGlowColor(order.status)"></div>

            <!-- Order Header -->
            <div class="flex justify-between items-start mb-4 relative z-10">
              <div>
                <h3 class="font-black text-lg text-on-surface">{{ order.userName }}</h3>
                <span class="text-xs text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-lg inline-block mt-1 font-bold">
                  {{ order.paymentMethod === 'cash' ? 'دفع عند الاستلام' : 'دفع إلكتروني' }}
                </span>
              </div>
              <div class="text-left">
                <div class="text-[10px] text-on-surface-variant">{{ order.createdAt | date:'shortTime' }}</div>
                <div class="text-xs font-black text-amber-600 bg-amber-600/10 px-2 py-0.5 rounded-full mt-1">{{ order.totalAmount }} EGC</div>
              </div>
            </div>

            <!-- Items -->
            <div class="bg-surface-container rounded-2xl p-3 mb-4 flex-1">
              <h4 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">المنتجات المطلوبة</h4>
              <ul class="space-y-2">
                <li *ngFor="let item of order.items" class="flex items-center gap-3 text-sm font-medium text-on-surface">
                  <span class="w-6 h-6 rounded bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs font-black">{{ item.quantity }}x</span>
                  <span>{{ item.product.name }}</span>
                </li>
              </ul>
            </div>

            <!-- Actions (Change Status) -->
            <div class="mt-auto relative z-10 border-t border-surface-container-high pt-4">
              <div class="flex items-center gap-2">
                <button *ngIf="order.status === 'pending'" (click)="updateStatus(order.id, 'preparing')" class="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex justify-center items-center gap-2 transition-colors">
                  <svg lucideIcon="flame" class="w-4 h-4"></svg> بدء التحضير والخبز
                </button>
                <button *ngIf="order.status === 'preparing'" (click)="updateStatus(order.id, 'ready')" class="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex justify-center items-center gap-2 transition-colors">
                  <svg lucideIcon="check-circle-2" class="w-4 h-4"></svg> جاهز وساخن للاستلام
                </button>
                <button *ngIf="order.status === 'ready'" (click)="updateStatus(order.id, 'completed')" class="flex-1 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs flex justify-center items-center gap-2 transition-colors border border-outline">
                  <svg lucideIcon="check-square" class="w-4 h-4"></svg> تم التسليم للعميل
                </button>
                
                <button *ngIf="order.status === 'pending'" (click)="updateStatus(order.id, 'cancelled')" class="p-2.5 rounded-xl bg-error/10 hover:bg-error/20 text-error flex items-center justify-center transition-colors">
                  <svg lucideIcon="x" class="w-4 h-4"></svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
  `]
})
export class BakeryAdminComponent implements OnInit {
  bakery = inject(BakeryService);

  ngOnInit() {
    this.bakery.listenToAllActiveOrders();
  }

  updateStatus(orderId: string, status: BakeryOrder['status']) {
    this.bakery.updateOrderStatus(orderId, status);
  }

  getGlowColor(status: string): string {
    if (status === 'ready') return 'bg-emerald-500';
    if (status === 'preparing') return 'bg-orange-500';
    return 'bg-amber-500';
  }
}
