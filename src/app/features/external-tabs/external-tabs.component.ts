import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ExternalLink, Trash2, Plus, Bookmark, Search, Tag, Globe } from 'lucide-angular';

export interface ExternalTabItem {
  id: string;
  title: string;
  url: string;
  category: string;
  notes?: string;
  createdAt: string;
  favicon?: string;
}

@Component({
  selector: 'app-external-tabs',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto flex flex-col min-h-screen animate-in fade-in duration-700 font-sans text-right" dir="rtl">
      <!-- Header -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 class="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <span class="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
              <lucide-icon [img]="Bookmark" class="size-8"></lucide-icon>
            </span>
            أرشيف التبويبات الخارجية
          </h1>
          <p class="text-slate-400 text-base mt-2 max-w-2xl leading-relaxed">
            ودع استهلاك الرامات في المتصفح! احفظ روابط فيسبوك والمواقع الخارجية هنا، وأغلق التبويبات الزائدة وأنت مطمئن لتعود لها في أي وقت. (حفظ محلي فائق السرعة).
          </p>
        </div>

        <button 
          (click)="openAddModal()" 
          class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2">
          <lucide-icon [img]="Plus" class="size-5"></lucide-icon>
          حفظ تبويب جديد
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
            placeholder="ابحث في الروابط المحفوظة..." 
            class="w-full pr-12 pl-4 bg-slate-900 border border-white/10 text-white placeholder:text-slate-500 rounded-2xl h-12 focus:outline-none focus:border-indigo-500/50 shadow-inner">
        </div>

        <!-- Category Filters -->
        <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <button 
            (click)="selectedCategory.set('all')"
            [class]="selectedCategory() === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'"
            class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap">
            الكل ({{ tabs().length }})
          </button>
          @for (cat of categories; track cat) {
            <button 
              (click)="selectedCategory.set(cat)"
              [class]="selectedCategory() === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'"
              class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap">
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
                  <span class="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                    <lucide-icon [img]="Tag" class="size-3"></lucide-icon>
                    {{ tab.category }}
                  </span>
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
                    <h3 class="font-bold text-white text-base truncate group-hover:text-indigo-300 transition-colors">{{ tab.title }}</h3>
                    <a [href]="tab.url" target="_blank" class="text-xs text-slate-400 hover:text-indigo-400 truncate block dir-ltr text-right mt-0.5">{{ tab.url }}</a>
                  </div>
                </div>

                @if (tab.notes) {
                  <p class="text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-white/5 mb-4 line-clamp-2">{{ tab.notes }}</p>
                }
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                <button 
                  (click)="deleteTab(tab.id)" 
                  class="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors" title="حذف الرابط">
                  <lucide-icon [img]="Trash2" class="size-4"></lucide-icon>
                </button>

                <a 
                  [href]="tab.url" 
                  target="_blank" 
                  class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/30">
                  <span>فتح الموقع</span>
                  <lucide-icon [img]="ExternalLink" class="size-3.5"></lucide-icon>
                </a>
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
          <p class="text-slate-400 text-sm max-w-sm mb-6">قم بحفظ روابط المواقع التي تتركها مفتوحة عادة لتوفير مساحة الذاكرة في المتصفح.</p>
          <button 
            (click)="openAddModal()" 
            class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg">
            أضف أول رابط الآن
          </button>
        </div>
      }

      <!-- Add / Edit Modal -->
      @if (showModal) {
        <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 class="text-2xl font-black text-white mb-6">حفظ تبويب خارجي جديد</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-2">عنوان الموقع أو الصفحة</label>
                <input type="text" [(ngModel)]="formTitle" placeholder="مثال: فيسبوك - مجموعة العمل..." class="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500">
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
                <textarea [(ngModel)]="formNotes" placeholder="لماذا تركت هذا الرابط مفتوحاً؟" class="w-full bg-black/40 border border-white/10 text-white rounded-xl p-4 h-24 focus:outline-none focus:border-indigo-500 resize-none"></textarea>
              </div>
            </div>

            <div class="flex gap-4 mt-8">
              <button (click)="showModal = false" class="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all">إلغاء</button>
              <button (click)="saveTab()" class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30">حفظ في الأرشيف المحلي</button>
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
  ExternalLink = ExternalLink;
  Trash2 = Trash2;
  Plus = Plus;
  Bookmark = Bookmark;
  Search = Search;
  Tag = Tag;
  Globe = Globe;

  tabs = signal<ExternalTabItem[]>([]);
  searchQuery = '';
  selectedCategory = signal<string>('all');
  
  categories = ['تواصل اجتماعي', 'عمل ومشاريع', 'دراسة وبحوث', 'أخبار ومقالات', 'أخرى'];

  showModal = false;
  formTitle = '';
  formUrl = '';
  formCategory = 'تواصل اجتماعي';
  formNotes = '';

  private STORAGE_KEY = 'si_neuro_external_tabs_vault';

  ngOnInit() {
    this.loadFromLocalStorage();
  }

  loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.tabs.set(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load tabs', e);
    }
  }

  saveToLocalStorage(items: ExternalTabItem[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save tabs', e);
    }
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
    this.showModal = true;
  }

  saveTab() {
    if (!this.formTitle.trim() || !this.formUrl.trim()) return;

    let formattedUrl = this.formUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    let favicon = '';
    try {
      const domain = new URL(formattedUrl).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {}

    const newItem: ExternalTabItem = {
      id: 'tab_' + Date.now(),
      title: this.formTitle.trim(),
      url: formattedUrl,
      category: this.formCategory,
      notes: this.formNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      favicon
    };

    const updated = [newItem, ...this.tabs()];
    this.tabs.set(updated);
    this.saveToLocalStorage(updated);
    this.showModal = false;
  }

  deleteTab(id: string) {
    if (confirm('هل أنت متأكد من حذف هذا الرابط من الأرشيف؟')) {
      const updated = this.tabs().filter(t => t.id !== id);
      this.tabs.set(updated);
      this.saveToLocalStorage(updated);
    }
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
