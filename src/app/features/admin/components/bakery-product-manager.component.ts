import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BakeryService, BakeryProduct } from '../../../core/services/bakery.service';
import { ImageOptimizerService } from '../../../core/services/image-optimizer.service';
import { LucideDynamicIcon } from '@lucide/angular';
import { ImageFallbackDirective } from '../../../shared/directives/image-fallback.directive';
import { ImagePreviewDirective } from '../../../shared/directives/image-preview.directive';

@Component({
  selector: 'app-bakery-product-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, ImageFallbackDirective, ImagePreviewDirective],
  template: `
    <div class="h-full flex flex-col font-sans text-right" dir="rtl">
      
      <!-- Header & Add Button -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="font-black text-xl text-on-surface">إدارة المنتجات</h3>
          <p class="text-sm font-medium text-on-surface-variant">إضافة، تعديل وحذف منتجات المخبز المعروضة للزبائن</p>
        </div>
        <button (click)="openAddForm()" class="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors">
          <svg lucideIcon="plus" class="w-5 h-5"></svg> إضافة منتج جديد
        </button>
      </div>

      <!-- Products Grid -->
      <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div *ngFor="let p of bakery.products()" class="bg-surface-container-low rounded-3xl overflow-hidden border border-surface-container-high shadow-sm relative group flex flex-col">
            
            <div class="relative h-40 bg-surface-container-high">
              <img [src]="p.imageUrl" appImageFallback class="w-full h-full object-cover">
              <div *ngIf="!p.isAvailable" class="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <span class="bg-error text-white px-3 py-1 rounded-full text-xs font-bold">غير متوفر</span>
              </div>
            </div>

            <div class="p-4 flex flex-col flex-1">
              <div class="flex justify-between items-start mb-2">
                <h4 class="font-black text-base text-on-surface">{{ p.name }}</h4>
                <div class="text-amber-600 font-black text-sm">{{ p.price }} <span class="text-[10px]">EGC</span></div>
              </div>
              <p class="text-xs text-on-surface-variant line-clamp-2 mb-3 flex-1">{{ p.description }}</p>
              
              <div class="flex items-center flex-wrap gap-2 text-[10px] font-bold text-on-surface-variant mb-4">
                <span class="bg-surface-container-high px-2 py-1 rounded-md">{{ p.category }}</span>
                <span class="flex items-center gap-1"><svg lucideIcon="clock" class="w-3 h-3"></svg> {{ p.preparationTimeMins }} دقيقة</span>
                <span *ngIf="p.isPreorderOnly" class="bg-gradient-to-l from-amber-500 to-amber-600 text-white shadow-sm px-2.5 py-1 rounded-md flex items-center gap-1 tracking-wide">يُعد بالحجز</span>
              </div>

              <div class="grid grid-cols-2 gap-2 mt-auto">
                <button (click)="openEditForm(p)" class="py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors flex justify-center items-center gap-2">
                  <svg lucideIcon="edit" class="w-3.5 h-3.5"></svg> تعديل
                </button>
                <button (click)="deleteProduct(p)" class="py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error font-bold text-xs transition-colors flex justify-center items-center gap-2">
                  <svg lucideIcon="trash-2" class="w-3.5 h-3.5"></svg> حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal (Overlay) -->
      <div *ngIf="showForm()" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-surface-container-low w-full max-w-lg rounded-3xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col max-h-[90vh]">
          
          <div class="p-5 border-b border-surface-container-high flex justify-between items-center bg-surface-container">
            <h3 class="font-black text-lg text-on-surface">{{ isEditing() ? 'تعديل المنتج' : 'إضافة منتج جديد' }}</h3>
            <button (click)="closeForm()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
              <svg lucideIcon="x" class="w-5 h-5"></svg>
            </button>
          </div>

          <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
            <div>
              <label class="block text-xs font-bold text-on-surface-variant mb-1.5">اسم المنتج</label>
              <input type="text" [(ngModel)]="formData.name" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-amber-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-on-surface-variant mb-1.5">الوصف</label>
              <textarea [(ngModel)]="formData.description" rows="2" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-amber-500"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-on-surface-variant mb-1.5">السعر (EGC)</label>
                <input type="number" [(ngModel)]="formData.price" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-amber-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-on-surface-variant mb-1.5">وقت التحضير (دقيقة)</label>
                <input type="number" [(ngModel)]="formData.preparationTimeMins" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-amber-500">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-xs font-bold text-on-surface-variant mb-1.5">التصنيف</label>
                <input list="category-list" [(ngModel)]="formData.category" class="w-full bg-white dark:bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-amber-500" placeholder="اختر أو اكتب تصنيفاً">
                <datalist id="category-list">
                  <option *ngFor="let cat of bakery.categories()" [value]="cat"></option>
                </datalist>
              </div>
              <div class="flex flex-col justify-center gap-3 mt-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="formData.isAvailable" class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-surface-container-high border-surface-container-high">
                  <span class="text-sm font-bold text-on-surface">متاح للطلب (معروض)؟</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="formData.isPreorderOnly" class="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-surface-container-high border-surface-container-high">
                  <span class="text-sm font-bold text-on-surface">يتطلب حجز مسبق فقط (غير جاهز)؟</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-on-surface-variant mb-1.5">صورة المنتج</label>
              
              <div class="relative">
                <input type="file" accept="image/*" (change)="onFileSelected($event)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                <div class="w-full bg-white dark:bg-surface-container-lowest border border-dashed border-surface-container-highest rounded-xl px-4 py-4 text-sm text-center text-on-surface-variant flex flex-col items-center justify-center gap-2 group hover:border-amber-500 hover:bg-amber-500/5 transition-all">
                  <svg lucideIcon="upload-cloud" class="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform"></svg>
                  <span class="font-bold">اضغط هنا لاختيار صورة من جهازك</span>
                </div>
              </div>
              
              <div *ngIf="formData.imageUrl" class="mt-3 h-32 rounded-xl overflow-hidden border border-surface-container-high bg-surface-container relative">
                <img [src]="formData.imageUrl" appImageFallback class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/20"></div>
                <span class="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">معاينة الصورة</span>
                
                <button (click)="removeImage()" class="absolute top-2 right-2 bg-error text-white p-1.5 rounded-lg shadow-lg hover:bg-red-600 z-20 transition-colors" title="حذف الصورة">
                  <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
                </button>
              </div>
            </div>

          </div>

          <div class="p-5 border-t border-surface-container-high bg-surface-container flex justify-end gap-3 shrink-0">
            <button (click)="closeForm()" class="px-5 py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">
              إلغاء
            </button>
            <button (click)="saveProduct()" [disabled]="!isFormValid()" class="bg-amber-600 hover:bg-amber-700 disabled:bg-surface-container-high disabled:text-on-surface-variant text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-600/20 disabled:shadow-none">
              حفظ المنتج
            </button>
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
export class BakeryProductManagerComponent {
  bakery = inject(BakeryService);
  imageOptimizer = inject(ImageOptimizerService);
  
  showForm = signal(false);
  isEditing = signal(false);
  editingId: string | null = null;
  
  formData: any = this.getDefaultForm();

  getDefaultForm() {
    return {
      name: '',
      description: '',
      price: 10,
      imageUrl: '',
      category: 'خبز',
      isAvailable: true,
      isPreorderOnly: false,
      preparationTimeMins: 15
    };
  }

  openAddForm() {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = this.getDefaultForm();
    this.showForm.set(true);
  }

  openEditForm(product: BakeryProduct) {
    this.isEditing.set(true);
    this.editingId = product.id;
    this.formData = { ...product };
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  isFormValid() {
    return this.formData.name.trim().length > 0 && 
           this.formData.description.trim().length > 0 && 
           this.formData.price > 0 &&
           this.formData.imageUrl.trim().length > 0;
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      try {
        const compressedBase64 = await this.imageOptimizer.compressImage(file);
        this.formData.imageUrl = compressedBase64;
      } catch (err) {
        console.error('Failed to compress image', err);
      }
    }
  }

  removeImage() {
    this.formData.imageUrl = '';
  }

  async saveProduct() {
    if (!this.isFormValid()) return;

    if (this.isEditing() && this.editingId) {
      await this.bakery.updateBakeryProduct(this.editingId, this.formData);
    } else {
      await this.bakery.addBakeryProduct(this.formData);
    }
    this.closeForm();
  }

  deleteProduct(product: BakeryProduct) {
    if (confirm(`هل أنت متأكد من حذف ${product.name}؟`)) {
      this.bakery.deleteBakeryProduct(product.id);
    }
  }
}
