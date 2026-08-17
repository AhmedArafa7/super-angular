import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  LucideAngularModule, ExternalLink, Trash2, Plus, Bookmark, Search, Tag, 
  Globe, Pin, PinOff, LayoutDashboard, Maximize2, Sparkles, AppWindow
} from 'lucide-angular';
import { ExternalTabsService, ExternalTabItem } from '../../core/services/external-tabs.service';

@Component({
  selector: 'app-external-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto flex flex-col min-h-screen animate-in fade-in duration-700 font-sans text-right" dir="rtl">
      <!-- Header -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 class="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span class="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <lucide-icon [img]="Bookmark" class="size-8"></lucide-icon>
            </span>
            أرشيف التبويبات والأقسام الخارجية
          </h1>
          <p class="text-slate-400 text-base mt-2 max-w-2xl leading-relaxed">
            احفظ روابط المواقع والملفات والمجلدات الخارجية هنا، وافتحها <strong class="text-indigo-400">كقسم مباشر داخل المنصة</strong> أو ثبتها بالشريط الجانبي مثل باقي الأقسام.
          </p>
        </div>

        <button 
          (click)="openAddModal()" 
          class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer">
          <lucide-icon [img]="Plus" class="size-5"></lucide-icon>
          حفظ تبويب أو قسم جديد
        </button>
      </div>

      <!-- Search & Categories Toolbar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <!-- Search -->
        <div class="relative w-full sm:w-96">
          <lucide-icon [img]="Search" class="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-slate-500"></lucide-icon>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="ابحث في الروابط والأقسام المحفوظة..." 
            class="w-full pr-12 pl-4 bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 rounded-2xl h-12 focus:outline-none focus:border-indigo-500/50 shadow-inner">
        </div>

        <!-- Category Filters -->
        <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <button 
            (click)="selectedCategory.set('all')"
            [class]="selectedCategory() === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'"
            class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer">
            الكل ({{ tabs().length }})
          </button>
          @for (cat of categories; track cat) {
            <button 
              (click)="selectedCategory.set(cat)"
              [class]="selectedCategory() === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'"
              class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer">
              {{ cat }}
            </button>
          }
        </div>
      </div>

      <!-- Tabs Grid -->
      @if (filteredTabs().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (tab of filteredTabs(); track tab.id) {
            <div class="group bg-slate-900/80 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 rounded-[2rem] p-6 shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
              <div class="absolute top-0 right-0 size-24 bg-indigo-500/5 blur-2xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-all"></div>

              <div>
                <!-- Top Meta -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <span class="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                      <lucide-icon [img]="Tag" class="size-3"></lucide-icon>
                      {{ tab.category }}
                    </span>
                    @if (tab.isPinnedToSidebar) {
                      <span class="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-bold text-amber-300 flex items-center gap-1">
                        <lucide-icon [img]="Pin" class="size-2.5"></lucide-icon>
                        مثبت بالشريط
                      </span>
                    }
                  </div>
                  <span class="text-[11px] text-slate-500 font-mono">{{ tab.createdAt | date:'yyyy/MM/dd' }}</span>
                </div>

                <!-- Title & URL -->
                <div class="flex items-start gap-3 mb-3">
                  <div class="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    @if (tab.favicon) {
                      <img [src]="tab.favicon" class="size-6 object-contain" (error)="$any($event.target).style.display='none'">
                    } @else {
                      <lucide-icon [img]="Globe" class="size-5 text-indigo-400"></lucide-icon>
                    }
                  </div>
                  <div class="min-w-0 flex-1">
                    <a [routerLink]="['/external-tabs/view', tab.id]" class="font-bold text-white text-base truncate block hover:text-indigo-300 transition-colors cursor-pointer">
                      {{ tab.title }}
                    </a>
                    <span class="text-xs text-slate-400 truncate block dir-ltr text-right mt-0.5">{{ tab.url }}</span>
                  </div>
                </div>

                @if (tab.notes) {
                  <p class="text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-white/5 mb-4 line-clamp-2">{{ tab.notes }}</p>
                }
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between pt-4 border-t border-white/5 mt-4 gap-2">
                <!-- Delete & Pin Actions -->
                <div class="flex items-center gap-1">
                  <button 
                    (click)="deleteTab(tab.id)" 
                    class="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer" title="حذف الرابط">
                    <lucide-icon [img]="Trash2" class="size-4"></lucide-icon>
                  </button>

                  <button 
                    (click)="togglePin(tab.id)" 
                    [title]="tab.isPinnedToSidebar ? 'إلغاء التثبيت من الشريط الجانبي' : 'تثبيت كقسم في الشريط الجانبي'" 
                    [class]="tab.isPinnedToSidebar ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'"
                    class="p-2 rounded-xl transition-colors cursor-pointer">
                    <lucide-icon [img]="tab.isPinnedToSidebar ? PinOff : Pin" class="size-4"></lucide-icon>
                  </button>
                </div>

                <!-- Launch Buttons -->
                <div class="flex items-center gap-2">
                  <!-- External Tab Fallback -->
                  <a 
                    [href]="tab.url" 
                    target="_blank" 
                    title="فتح في لسان خارجي جديد"
                    class="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-white/10">
                    <lucide-icon [img]="ExternalLink" class="size-3.5"></lucide-icon>
                  </a>

                  <!-- Open as In-App Section (Primary Action) -->
                  <a 
                    [routerLink]="['/external-tabs/view', tab.id]" 
                    class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/30">
                    <lucide-icon [img]="AppWindow" class="size-3.5"></lucide-icon>
                    <span>فتح كقسم</span>
                  </a>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center py-24 text-center glass border-white/5 rounded-[2.5rem]">
          <div class="size-20 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
            <lucide-icon [img]="Bookmark" class="size-10"></lucide-icon>
          </div>
          <h3 class="text-xl font-bold text-white mb-2">لا توجد تبويبات محفوظة</h3>
          <p class="text-slate-400 text-sm max-w-sm mb-6">قم بحفظ روابط المواقع التي تريد فتحها كأقسام داخل المنصة أو الرجوع لها لاحقاً.</p>
          <button 
            (click)="openAddModal()" 
            class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg cursor-pointer">
            أضف أول رابط وقسم الآن
          </button>
        </div>
      }

      <!-- Add / Edit Modal -->
      @if (showModal) {
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 class="text-2xl font-black text-white mb-6">حفظ تبويب أو قسم خارجي جديد</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-2">عنوان الموقع أو القسم</label>
                <input type="text" [(ngModel)]="formTitle" placeholder="مثال: Google Drive أو كورس الباكاند..." class="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500">
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-2">رابط الموقع (URL)</label>
                <input type="url" [(ngModel)]="formUrl" (blur)="onUrlBlur()" placeholder="https://example.com" class="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500 dir-ltr text-right">
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-2">التصنيف</label>
                <select [(ngModel)]="formCategory" class="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-2">ملاحظات سريعة (اختياري)</label>
                <textarea [(ngModel)]="formNotes" placeholder="ملاحظات توضيحية حول هذا القسم..." class="w-full bg-black/40 border border-white/10 text-white rounded-xl p-4 h-20 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
              </div>

              <!-- Pin to Sidebar Option -->
              <div class="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                <input type="checkbox" id="pinSidebar" [(ngModel)]="formPinToSidebar" class="size-4 text-indigo-600 rounded">
                <label for="pinSidebar" class="text-xs font-bold text-white cursor-pointer select-none">
                  تثبيت كقسم دائم في القائمة الجانبية (Sidebar)
                </label>
              </div>
            </div>

            <div class="flex gap-4 mt-8">
              <button (click)="showModal = false" class="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer">إلغاء</button>
              <button (click)="saveTab()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 cursor-pointer">حفظ في الأرشيف ⚡</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ExternalTabsComponent implements OnInit {
  externalTabsService = inject(ExternalTabsService);

  ExternalLink = ExternalLink;
  Trash2 = Trash2;
  Plus = Plus;
  Bookmark = Bookmark;
  Search = Search;
  Tag = Tag;
  Globe = Globe;
  Pin = Pin;
  PinOff = PinOff;
  LayoutDashboard = LayoutDashboard;
  Maximize2 = Maximize2;
  Sparkles = Sparkles;
  AppWindow = AppWindow;

  tabs = this.externalTabsService.tabs;
  searchQuery = '';
  selectedCategory = signal<string>('all');
  
  categories = ['تواصل اجتماعي', 'عمل ومشاريع', 'دراسة وبحوث', 'أخبار ومقالات', 'أخرى'];

  showModal = false;
  formTitle = '';
  formUrl = '';
  formCategory = 'تواصل اجتماعي';
  formNotes = '';
  formPinToSidebar = false;

  ngOnInit() {
    this.externalTabsService.loadTabs();
  }

  onUrlBlur() {
    if (!this.formTitle.trim() && this.formUrl.trim()) {
      try {
        let urlStr = this.formUrl.trim();
        if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
          urlStr = 'https://' + urlStr;
        }
        const hostname = new URL(urlStr).hostname;
        const parts = hostname.replace('www.', '').split('.');
        if (parts.length > 0) {
          const mainPart = parts[parts.length - 2] || parts[0];
          this.formTitle = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
        }
      } catch {}
    }
  }

  openAddModal() {
    this.formTitle = '';
    this.formUrl = '';
    this.formCategory = this.categories[0];
    this.formNotes = '';
    this.formPinToSidebar = false;
    this.showModal = true;
  }

  saveTab() {
    if (!this.formTitle.trim() || !this.formUrl.trim()) return;

    this.externalTabsService.addTab({
      title: this.formTitle,
      url: this.formUrl,
      category: this.formCategory,
      notes: this.formNotes,
      isPinnedToSidebar: this.formPinToSidebar
    });

    this.showModal = false;
  }

  deleteTab(id: string) {
    if (confirm('هل أنت متأكد من حذف هذا الرابط من الأرشيف؟')) {
      this.externalTabsService.deleteTab(id);
    }
  }

  togglePin(id: string) {
    this.externalTabsService.togglePinToSidebar(id);
  }

  filteredTabs = () => {
    const q = this.searchQuery.trim().toLowerCase();
    const cat = this.selectedCategory();
    return this.tabs().filter(t => {
      const matchesCat = cat === 'all' || t.category === cat;
      const matchesQ = !q || t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q));
      return matchesCat && matchesQ;
    });
  };
}

