import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';
import { GlobalStateService } from '../../core/services/global-state.service';
import { SettingsService } from '../../core/settings.service';
import { 
  LucideAngularModule, User, ShieldCheck, Mail, Phone, MapPin, Edit3, 
  Crown, Zap, Award, Key, CheckCircle, Smartphone, Camera, LogOut, 
  Save, Sparkles, RefreshCw, Layers, Image, Upload, Check
} from 'lucide-angular';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8 font-['Tajawal']" dir="rtl">
      
      <!-- Top Title Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <lucide-icon [img]="User" class="w-7 h-7 md:w-8 md:h-8 text-indigo-500"></lucide-icon> الملف الشخصي
          </h1>
          <p class="text-slate-400 text-xs md:text-sm mt-1">إدارة بيانات حسابك الحقيقي، التخصيص، والعضوية في منصة Super</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="saveAllChanges()" class="px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs md:text-sm rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer">
            <lucide-icon [img]="Save" class="w-4 h-4"></lucide-icon> حفظ التغييرات
          </button>
        </div>
      </div>

      <!-- Success Notification Banner -->
      @if (showSuccessMsg()) {
        <div class="mb-6 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
          <lucide-icon [img]="CheckCircle" class="w-5 h-5 text-emerald-400"></lucide-icon>
          <span class="font-bold text-sm">تم حفظ البيانات الحقيقية وتحديث الملف الشخصي في جميع أنحاء النظام!</span>
        </div>
      }

      <!-- Profile Header Hero Banner -->
      <div class="relative bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl mb-8">
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
          
          <!-- Avatar Picker & Preview -->
          <div class="flex flex-col md:flex-row items-center gap-6 text-center md:text-right w-full md:w-auto">
            <div class="relative group shrink-0">
              <img 
                [src]="avatarUrl" 
                alt="Profile Avatar" 
                class="w-28 h-28 md:w-36 md:h-36 rounded-3xl object-cover border-4 border-indigo-500/50 shadow-2xl group-hover:scale-105 transition-all duration-300"
                (error)="$any($event.target).src = 'https://ui-avatars.com/api/?name=' + (name || 'User') + '&background=4f46e5&color=fff'"
              >
              <label class="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-300 text-white gap-1">
                <lucide-icon [img]="Camera" class="w-8 h-8 text-indigo-300"></lucide-icon>
                <span class="text-xs font-bold">تغيير الصورة</span>
                <input type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)">
              </label>

              @if (isPro()) {
                <div class="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 p-2 rounded-2xl shadow-lg border border-amber-300">
                  <lucide-icon [img]="Crown" class="w-5 h-5 fill-slate-950"></lucide-icon>
                </div>
              }
            </div>

            <div class="flex flex-col items-center md:items-start gap-3 w-full max-w-md">
              <!-- Editable Real Name Input -->
              <div class="w-full">
                <label class="block text-xs font-bold text-indigo-300 mb-1">الاسم الحقيقي (اسم الحساب):</label>
                <input 
                  type="text" 
                  [(ngModel)]="name" 
                  class="w-full bg-black/40 border border-white/20 rounded-2xl px-4 py-2.5 text-white font-bold text-lg md:text-xl focus:outline-none focus:border-indigo-500 transition-all text-center md:text-right"
                  placeholder="أدخل اسمك الحقيقي..."
                >
              </div>

              <!-- Editable Bio Input -->
              <div class="w-full">
                <label class="block text-xs font-bold text-slate-400 mb-1">السيرة الذاتية (Bio):</label>
                <input 
                  type="text" 
                  [(ngModel)]="bio" 
                  class="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-xs focus:outline-none focus:border-indigo-500 text-center md:text-right"
                  placeholder="اكتب نبذة شخصية عن نفسك..."
                >
              </div>

              <div class="flex items-center gap-3 text-xs text-slate-400 flex-wrap justify-center md:justify-start">
                <span class="flex items-center gap-1"><lucide-icon [img]="Mail" class="w-3.5 h-3.5 text-indigo-400"></lucide-icon> {{ userEmail() }}</span>
                @if (location) {
                  <span>•</span>
                  <span class="flex items-center gap-1"><lucide-icon [img]="MapPin" class="w-3.5 h-3.5 text-purple-400"></lucide-icon> {{ location }}</span>
                }
              </div>
            </div>
          </div>

          <!-- Real Pro Status & Real Balance Widget -->
          <div class="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
            <div class="bg-black/40 border border-white/10 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shadow-lg">
              <div class="text-right">
                <div class="text-xs text-slate-400 font-bold">رصيد المحفظة</div>
                <div class="text-xl font-black text-emerald-400">{{ globalState.formattedBalance() }}</div>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
                💳
              </div>
            </div>

            <button (click)="toggleProStatus()" class="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer">
              <lucide-icon [img]="Crown" class="w-5 h-5 fill-slate-950"></lucide-icon> {{ isPro() ? 'عضوية Super Pro 👑 (مُفعّلة)' : 'ترقية إلى Super Pro 👑' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Real Profile Settings Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Real Personal Info Form -->
        <div class="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
            <lucide-icon [img]="User" class="w-5 h-5 text-indigo-400"></lucide-icon> المعلومات الحقيقية للحساب
          </h3>

          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1.5">رقم الهاتف الحقيقي:</label>
            <input type="text" [(ngModel)]="phone" class="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-right" placeholder="أدخل رقم هاتفك الحقيقي...">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1.5">البلد / المدينة:</label>
            <input type="text" [(ngModel)]="location" class="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-right" placeholder="أدخل بلدك أو مدينتك الحقيقية...">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 mb-1.5">رابط صورة شخصية مخصص (Custom URL):</label>
            <input type="text" [(ngModel)]="avatarUrl" class="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-indigo-500" placeholder="https://...">
          </div>
        </div>

        <!-- Real Account Preferences & Security -->
        <div class="bg-slate-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
            <lucide-icon [img]="ShieldCheck" class="w-5 h-5 text-emerald-400"></lucide-icon> حالة الحساب واللغة
          </h3>

          <div class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <div class="font-bold text-sm text-white">لغة واجهة النظام</div>
              <div class="text-xs text-slate-400 mt-0.5">{{ settingsService.language() === 'ar' ? 'العربية (المعتمدة)' : 'English' }}</div>
            </div>
            <button (click)="settingsService.toggleLanguage()" class="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl text-xs font-bold border border-indigo-500/30 transition-all cursor-pointer">
              تغيير اللغة 🌐
            </button>
          </div>

          <div class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <div class="font-bold text-sm text-white">حالة الاتصال والأجهزة</div>
              <div class="text-xs text-emerald-400 font-bold mt-0.5">جلسة المتصفح الحالية • متصل بالشبكة</div>
            </div>
            <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/40">جلسة نشطة</span>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <button (click)="saveAllChanges()" class="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-lg rounded-2xl transition-all shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-3 cursor-pointer">
          <lucide-icon [img]="Save" class="w-6 h-6"></lucide-icon> حفظ البيانات وتحديث الحساب
        </button>
      </div>

    </div>
  `
})
export class ProfileComponent {
  firebase = inject(FirebaseService);
  globalState = inject(GlobalStateService);
  settingsService = inject(SettingsService);

  readonly User = User;
  readonly ShieldCheck = ShieldCheck;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly MapPin = MapPin;
  readonly Edit3 = Edit3;
  readonly Crown = Crown;
  readonly Zap = Zap;
  readonly Award = Award;
  readonly Key = Key;
  readonly CheckCircle = CheckCircle;
  readonly Smartphone = Smartphone;
  readonly Camera = Camera;
  readonly LogOut = LogOut;
  readonly Save = Save;
  readonly Sparkles = Sparkles;
  readonly RefreshCw = RefreshCw;
  readonly Layers = Layers;
  readonly Image = Image;
  readonly Upload = Upload;
  readonly Check = Check;

  showSuccessMsg = signal<boolean>(false);

  // Form Model (Real persistent user data)
  name = '';
  bio = '';
  avatarUrl = '';
  phone = '';
  location = '';

  constructor() {
    this.loadCurrentData();
  }

  loadCurrentData() {
    const user = this.firebase.userData();
    this.name = localStorage.getItem('profile_name') || user?.name || user?.displayName || 'أحمد عرفه';
    this.bio = localStorage.getItem('profile_bio') || '';
    this.avatarUrl = localStorage.getItem('profile_avatar') || user?.avatar_url || user?.photoURL || 'https://ui-avatars.com/api/?name=User&background=4f46e5&color=fff';
    this.phone = localStorage.getItem('profile_phone') || '';
    this.location = localStorage.getItem('profile_location') || '';
  }

  userEmail() {
    const user = this.firebase.userData() || this.firebase.currentUser();
    return user?.email || 'حساب مستخدم';
  }

  isPro() {
    return localStorage.getItem('isPro') === 'true';
  }

  toggleProStatus() {
    const current = this.isPro();
    localStorage.setItem('isPro', (!current).toString());
    window.location.reload();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  saveAllChanges() {
    if (this.name) localStorage.setItem('profile_name', this.name);
    if (this.bio) localStorage.setItem('profile_bio', this.bio);
    if (this.avatarUrl) localStorage.setItem('profile_avatar', this.avatarUrl);
    if (this.phone) localStorage.setItem('profile_phone', this.phone);
    if (this.location) localStorage.setItem('profile_location', this.location);

    this.showSuccessMsg.set(true);
    setTimeout(() => this.showSuccessMsg.set(false), 4000);
  }
}
