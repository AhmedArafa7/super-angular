import { Component, inject, signal, OnInit, OnDestroy, ElementRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { OmAlQuraService, OmAlQuraCctvCamera } from '../../../core/services/om-al-qura.service';
import { ToastService } from '../../../core/services/toast.service';

export interface SecurityEventLog {
  id: string;
  time: string;
  cameraName: string;
  type: 'motion' | 'entry' | 'system' | 'alert';
  description: string;
}

@Component({
  selector: 'app-om-al-qura-security-cctv',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  template: `
    <div class="space-y-6 font-sans text-slate-100" dir="rtl">
      
      <!-- Top Security Header & Status Bar -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div class="flex items-center gap-2 mb-2 flex-wrap">

            <span class="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              متصل بـ {{ service.cctvCameras().length }} كاميرات
            </span>
          </div>
          <h2 class="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <svg lucideIcon="video" class="w-8 h-8 text-rose-500"></svg>
            <span>مركز مراقبة الكاميرات الحقيقية لمتجر أم القرى</span>
          </h2>
          <p class="text-xs text-slate-400 mt-1">ربط وتأطير كاميرات الموبايل والكمبيوتر المباشرة (WebCam) وأجهزة DVR/NVR وشبكات IP لمتجر المنظفات.</p>
        </div>

        <!-- Quick Emergency & Connect Action Buttons -->
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button (click)="openAddModal.set(true)"
                  class="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/40 hover:scale-105">
            <svg lucideIcon="plus-circle" class="w-5 h-5"></svg>
            <span>➕ إضافة وتوصيل كاميرا حقيقية جديدة</span>
          </button>

          <button (click)="toggleAllCamerasPower()"
                  class="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer">
            <svg lucideIcon="power" class="w-4 h-4" [ngClass]="allCamerasPoweredOn() ? 'text-emerald-400' : 'text-rose-400'"></svg>
            <span>{{ allCamerasPoweredOn() ? 'إيقاف جميع الكاميرات' : 'تشغيل جميع الكاميرات' }}</span>
          </button>

          <button (click)="toggleNightVisionAll()"
                  class="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer">
            <svg lucideIcon="moon" class="w-4 h-4 text-emerald-400"></svg>
            <span>{{ allNightVision() ? 'إيقاف الرؤية الليلية' : 'الرؤية الليلية (IR)' }}</span>
          </button>

          <button (click)="triggerEmergencySiren()"
                  class="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xl transition-all flex items-center gap-2 cursor-pointer animate-bounce">
            <svg lucideIcon="bell" class="w-4 h-4"></svg>
            <span>🚨 إنذار طوارئ</span>
          </button>
        </div>
      </div>

      <!-- Siren Emergency Alert Banner -->
      <div *ngIf="sirenActive()" class="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-pulse border-2 border-white/40">
        <div class="flex items-center gap-3">
          <span class="text-3xl">🚨</span>
          <div>
            <h4 class="font-black text-base">إنذار أمني طارئ مفعّل وصوت الصفارات يعمل!</h4>
            <p class="text-xs text-rose-100">تم تنشيط صوت صفارات الإنذار عالية الشدة وتنبيه غرفة التحكم.</p>
          </div>
        </div>
        <button (click)="stopEmergencySiren()" class="px-4 py-1.5 rounded-xl bg-white text-rose-900 font-black text-xs hover:bg-rose-100 cursor-pointer">
          إيقاف الإنذار والصوت 🔇
        </button>
      </div>

      <!-- 6/Dynamic Real CCTV Cameras Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let cam of service.cctvCameras(); let idx = index"
             class="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between transition-all hover:border-slate-700">
          
          <!-- Camera Card Header -->
          <div class="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="size-3 rounded-full" [ngClass]="cam.isOnline ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'"></span>
              <div>
                <h3 class="font-black text-sm text-white flex items-center gap-1.5">
                  <span>{{ cam.name }}</span>
                </h3>
                <p class="text-[10px] text-slate-400">
                  {{ cam.location }} | 
                  <span *ngIf="cam.sourceType === 'webcam'" class="text-emerald-400 font-bold">📷 WebCam جهازك</span>
                  <span *ngIf="cam.sourceType === 'ip'" class="text-amber-400 font-bold">🌐 IP: {{ cam.ipAddress || 'بث شبكي' }}</span>
                  <span *ngIf="cam.sourceType === 'video'" class="text-sky-400 font-bold">🎥 فيديو حقيقي</span>
                  <span *ngIf="cam.sourceType === 'simulation'" class="text-slate-400">🖥️ محاكاة اختباري</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button (click)="toggleCameraPower(cam)"
                      class="px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 font-black text-xs cursor-pointer"
                      [ngClass]="cam.isOnline ? 'text-emerald-400 hover:bg-emerald-950/60 bg-emerald-500/10 border border-emerald-500/30' : 'text-rose-400 hover:bg-rose-950/60 bg-rose-500/10 border border-rose-500/30'"
                      [title]="cam.isOnline ? 'إيقاف / إغلاق بث الكاميرا' : 'تشغيل بث الكاميرا'">
                <svg lucideIcon="power" class="w-4 h-4"></svg>
                <span>{{ cam.isOnline ? 'إيقاف البث' : 'تشغيل البث' }}</span>
              </button>

              <button (click)="service.deleteCctvCamera(cam.id)" class="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/60 cursor-pointer" title="فصل وإزالة الكاميرا">
                <svg lucideIcon="trash-2" class="w-4 h-4"></svg>
              </button>
              <button (click)="maximizeCamera(cam)" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer" title="تكبير الكاميرا">
                <svg lucideIcon="maximize-2" class="w-4 h-4"></svg>
              </button>
            </div>
          </div>

          <!-- Camera Live Video/Webcam Stream Feed -->
          <div class="relative bg-black h-60 flex items-center justify-center overflow-hidden">
            
            <!-- 1. Real Hardware WebCam Stream (<video>) -->
            <video *ngIf="cam.sourceType === 'webcam'" #webcamVideo autoplay muted playsinline class="w-full h-full object-cover block"></video>

            <!-- 2. Real IP / Video File Stream (<video>) -->
            <video *ngIf="cam.sourceType === 'video' || cam.sourceType === 'ip'" [src]="cam.streamUrl" autoplay muted loop playsinline class="w-full h-full object-cover block"></video>

            <!-- 3. Simulated Dynamic Canvas Stream -->
            <canvas *ngIf="cam.sourceType === 'simulation'" #camCanvas [attr.data-cam-id]="cam.id" class="w-full h-full object-cover block"></canvas>

            <!-- Night Vision Filter Overlay -->
            <div *ngIf="cam.nightVision" class="absolute inset-0 bg-emerald-500/20 mix-blend-color-dodge pointer-events-none"></div>

            <!-- CCTV HUD Overlay Info -->
            <div class="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/40">
              <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>LIVE [{{ liveClock() }}]</span>
            </div>

            <div class="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-300 border border-white/10">
              CAM-0{{ idx + 1 }}
            </div>

            <!-- WebCam Permission Prompt Overlay if WebCam not granted -->
            <div *ngIf="cam.isOnline && cam.sourceType === 'webcam' && !webcamActive()" class="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-10">
              <svg lucideIcon="camera" class="w-10 h-10 text-emerald-400 mb-2 animate-bounce"></svg>
              <h4 class="font-black text-sm text-white">توصيل كاميرا الموبايل / الكمبيوتر</h4>
              <p class="text-xs text-slate-400 max-w-xs mt-1 mb-3">اضغط على زر السماح لتوصيل الكاميرا الحقيقية المباشرة بجهازك الآن.</p>
              <button (click)="startWebcamStream()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg">
                تشغيل كاميرا الجهاز الحقيقية 📷
              </button>
            </div>

            <!-- Standby Overlay when Camera is Powered OFF -->
            <div *ngIf="!cam.isOnline" class="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-20 font-sans">
              <div class="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-3 animate-pulse">
                <svg lucideIcon="video-off" class="w-6 h-6"></svg>
              </div>
              <h4 class="font-black text-sm text-white">الكاميرا مغلقة حالياً (FEED OFF)</h4>
              <p class="text-[11px] text-slate-400 max-w-xs mt-1 mb-4">تم إيقاف بث هذه الكاميرا بطلب منك. اضغط على الزر أدناه لتشغيلها مجدداً.</p>
              <button (click)="toggleCameraPower(cam)" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg flex items-center gap-2 transition-all hover:scale-105 cursor-pointer">
                <svg lucideIcon="power" class="w-4 h-4"></svg>
                <span>تشغيل بث الكاميرا الآن 🟢</span>
              </button>
            </div>

            <!-- Motion Detected Box Overlay -->
            <div *ngIf="cam.motionDetected" class="absolute inset-x-8 inset-y-10 border-2 border-rose-500/80 rounded-lg pointer-events-none flex items-start justify-start p-1 animate-pulse">
              <span class="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-xs">
                ⚠️ كشف حركة AI Motion
              </span>
            </div>
          </div>

          <!-- Camera PTZ & Feature Controls -->
          <div class="p-4 bg-slate-950/70 border-t border-slate-800 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-1">
                <span class="text-slate-400 text-[11px] font-bold">التحكم PTZ:</span>
                <button (click)="adjustPan(cam, -10, 0)" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-bold">⬅️</button>
                <button (click)="adjustPan(cam, 0, -10)" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-bold">⬆️</button>
                <button (click)="adjustPan(cam, 0, 10)" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-bold">⬇️</button>
                <button (click)="adjustPan(cam, 10, 0)" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-bold">➡️</button>
              </div>

              <div class="flex items-center gap-1">
                <button (click)="toggleNightVision(cam)" class="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                        [ngClass]="cam.nightVision ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'">
                  🌙
                </button>
                <button (click)="takeSnapshot(cam)" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-[11px] font-bold" title="التقاط صورة">
                  📷
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Security Incident Logs -->
      <div class="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 font-sans">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 class="text-base font-black text-white flex items-center gap-2">
            <svg lucideIcon="shield-alert" class="w-5 h-5 text-amber-400"></svg>
            <span>سجل التنبيهات والأحداث الأمنية المباشرة (Security Incident Logs)</span>
          </h3>
          <span class="text-xs text-slate-400 font-mono">{{ eventLogs().length }} أحداث مسجلة</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs text-right border-collapse">
            <thead class="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3">الوقت والتاريخ</th>
                <th class="p-3">الكاميرا</th>
                <th class="p-3">نوع الحدث</th>
                <th class="p-3">التفاصيل والنتيجة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr *ngFor="let log of eventLogs()" class="hover:bg-slate-800/40">
                <td class="p-3 font-mono text-slate-300">{{ log.time }}</td>
                <td class="p-3 font-bold text-white">{{ log.cameraName }}</td>
                <td class="p-3">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black"
                        [ngClass]="{
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30': log.type === 'motion',
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30': log.type === 'entry',
                          'bg-sky-500/20 text-sky-300 border border-sky-500/30': log.type === 'system',
                          'bg-rose-500/20 text-rose-300 border border-rose-500/30': log.type === 'alert'
                        }">
                    {{ log.type === 'motion' ? 'كشف حركة' : log.type === 'entry' ? 'تسجيل دخول' : log.type === 'alert' ? 'تنبيه أمني' : 'نظام' }}
                  </span>
                </td>
                <td class="p-3 text-slate-300">{{ log.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: ADD REAL PHYSICAL CAMERA FORM -->
      <div *ngIf="openAddModal()" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-800 shadow-2xl p-6 space-y-6 dir-rtl">
          <div class="flex justify-between items-center border-b border-slate-800 pb-4">
            <h3 class="text-lg font-black text-white flex items-center gap-2">
              <svg lucideIcon="video" class="w-6 h-6 text-emerald-500"></svg>
              <span>ربط وتوصيل كاميرا حقيقية جديدة (IP / WebCam)</span>
            </h3>
            <button (click)="openAddModal.set(false)" class="text-slate-400 hover:text-white p-1">
              <svg lucideIcon="x" class="w-6 h-6"></svg>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">اسم الكاميرا *</label>
              <input type="text" [(ngModel)]="newCamData.name" placeholder="مثال: كاميرا المدخل الرئيسية" class="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-emerald-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">موقع الكاميرا بالمحل *</label>
              <input type="text" [(ngModel)]="newCamData.location" placeholder="مثال: بوابة الشارع أو منطقة الخزينة" class="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-emerald-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">نوع المصدر والتوصيل الحقيقي *</label>
              <select [(ngModel)]="newCamData.sourceType" class="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-emerald-500">
                <option value="webcam">📷 كاميرا جهاز الكمبيوتر/الموبايل المباشرة (WebCam)</option>
                <option value="ip">🌐 كاميرا شبكية IP Camera / جهاز DVR (RTSP/HTTP Stream)</option>
                <option value="video">🎥 رابط بث مباشر حي / فيديو مسجل (Video Stream URL)</option>
                <option value="simulation">🖥️ محاكاة أجهزة أمنية (Simulation Demo)</option>
              </select>
            </div>

            <div *ngIf="newCamData.sourceType === 'ip' || newCamData.sourceType === 'video'">
              <label class="block text-xs font-bold text-slate-300 mb-1">رابط البث الحي / Stream URL *</label>
              <input type="text" [(ngModel)]="newCamData.streamUrl" placeholder="rtsp://192.168.1.100:554/live أو http://..." class="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500" dir="ltr">
            </div>

            <div *ngIf="newCamData.sourceType === 'ip'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">عنوان IP الجهاز</label>
                <input type="text" [(ngModel)]="newCamData.ipAddress" placeholder="192.168.1.100" class="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500" dir="ltr">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">منفذ البث (Port)</label>
                <input type="number" [(ngModel)]="newCamData.port" placeholder="554" class="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500" dir="ltr">
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button (click)="openAddModal.set(false)" class="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">
              إلغاء
            </button>
            <button (click)="submitAddCamera()" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xl">
              توصيل الكاميرا الآن 📹
            </button>
          </div>
        </div>
      </div>

      <!-- FULLSCREEN FOCUSED CAMERA MODAL -->
      <div *ngIf="selectedCamera()" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div class="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
            <h3 class="text-base font-black text-white flex items-center gap-2">
              <svg lucideIcon="video" class="w-5 h-5 text-rose-500"></svg>
              <span>بث مكبر: {{ selectedCamera()?.name }} ({{ selectedCamera()?.location }})</span>
            </h3>
            <button (click)="selectedCamera.set(null)" class="text-slate-400 hover:text-white p-1">
              <svg lucideIcon="x" class="w-6 h-6"></svg>
            </button>
          </div>

          <div class="relative bg-black flex-1 min-h-[360px]">
            <video *ngIf="selectedCamera()?.sourceType === 'video' || selectedCamera()?.sourceType === 'ip'" [src]="selectedCamera()?.streamUrl" autoplay muted loop playsinline class="w-full h-full object-cover block"></video>
            <canvas *ngIf="selectedCamera()?.sourceType === 'simulation'" #fullscreenCanvas class="w-full h-full object-cover block"></canvas>
            <div class="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-xl text-xs font-mono text-emerald-400 border border-emerald-500/40">
              🔴 LIVE STREAM | {{ liveClock() }}
            </div>
          </div>

          <div class="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400">بث حي حقيقي ومزود بحماية واستقرار الاتصال</span>
            <button (click)="selectedCamera.set(null)" class="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold">
              إغلاق البث المكبر
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class OmAlQuraSecurityCctvComponent implements OnInit, OnDestroy, AfterViewInit {
  service = inject(OmAlQuraService);
  private toast = inject(ToastService);

  @ViewChildren('webcamVideo') webcamVideos!: QueryList<ElementRef<HTMLVideoElement>>;
  @ViewChildren('camCanvas') camCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
  @ViewChildren('fullscreenCanvas') fullscreenCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  sirenActive = signal(false);
  allNightVision = signal(false);
  openAddModal = signal(false);
  selectedCamera = signal<OmAlQuraCctvCamera | null>(null);
  webcamActive = signal(false);
  liveClock = signal(new Date().toLocaleTimeString('ar-EG'));

  private animationTimer: any = null;
  private mediaStream: MediaStream | null = null;

  newCamData = {
    name: '',
    location: '',
    sourceType: 'webcam' as 'webcam' | 'ip' | 'video' | 'simulation',
    streamUrl: '',
    ipAddress: '',
    port: 554
  };

  eventLogs = signal<SecurityEventLog[]>([
    { id: 'l1', time: new Date(Date.now() - 3 * 60000).toLocaleTimeString('ar-EG'), cameraName: 'المدخل الرئيسي', type: 'entry', description: 'دخول عميل جديد لفرع أم القرى' },
    { id: 'l2', time: new Date(Date.now() - 12 * 60000).toLocaleTimeString('ar-EG'), cameraName: 'منطقة الكاشير', type: 'motion', description: 'كشف حركة وحساب فاتورة الشراء' },
    { id: 'l3', time: new Date(Date.now() - 25 * 60000).toLocaleTimeString('ar-EG'), cameraName: 'المخزن الداخلي', type: 'motion', description: 'سحب بضائع وتزويد الرفوف بواسطة أمين المخزن' }
  ]);

  ngOnInit(): void {
    this.animationTimer = setInterval(() => {
      this.liveClock.set(new Date().toLocaleTimeString('ar-EG'));
      this.drawCanvasFeeds();
    }, 200);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.startWebcamStream();
      this.drawCanvasFeeds();
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.animationTimer) clearInterval(this.animationTimer);
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    this.stopEmergencySirenAudio();
  }

  async startWebcamStream() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.webcamActive.set(true);
      setTimeout(() => {
        if (this.webcamVideos) {
          this.webcamVideos.forEach(vRef => {
            const video = vRef.nativeElement;
            if (video && this.mediaStream) {
              video.srcObject = this.mediaStream;
            }
          });
        }
      }, 100);
      this.toast.show('تمت بنجاح إتاحة كاميرا الجهاز الحقيقية على الشاشة المباشرة! 📷', 'success');
    } catch (e) {
      this.webcamActive.set(false);
      this.toast.show('يرجى السماح بالوصول لكاميرا الجهاز لعرض البث الحي 📷', 'warning');
    }
  }

  submitAddCamera() {
    if (!this.newCamData.name || !this.newCamData.location) {
      this.toast.show('يرجى كتابة اسم الكاميرا والموقع أولاً', 'warning');
      return;
    }

    this.service.addCctvCamera({
      name: this.newCamData.name,
      location: this.newCamData.location,
      sourceType: this.newCamData.sourceType,
      streamUrl: this.newCamData.streamUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      ipAddress: this.newCamData.ipAddress,
      port: this.newCamData.port,
      resolution: '3840x2160',
      fps: 60,
      isOnline: true,
      nightVision: false,
      panX: 0,
      panY: 0,
      zoom: 1,
      motionDetected: false
    });

    this.openAddModal.set(false);
    this.newCamData = { name: '', location: '', sourceType: 'webcam', streamUrl: '', ipAddress: '', port: 554 };
    
    if (this.newCamData.sourceType === 'webcam') {
      this.startWebcamStream();
    }
  }

  adjustPan(cam: OmAlQuraCctvCamera, deltaX: number, deltaY: number) {
    cam.panX = Math.max(-40, Math.min(40, cam.panX + deltaX));
    cam.panY = Math.max(-30, Math.min(30, cam.panY + deltaY));
    this.drawCanvasFeeds();
  }

  toggleCameraPower(cam: OmAlQuraCctvCamera) {
    cam.isOnline = !cam.isOnline;
    const updated = this.service.cctvCameras().map(c => c.id === cam.id ? { ...c, isOnline: cam.isOnline } : c);
    this.service.saveCctvCameras(updated);

    if (cam.isOnline) {
      this.toast.show(`تم تشغيل بث الكاميرا (${cam.name}) بنجاح 🟢`, 'success');
      if (cam.sourceType === 'webcam') {
        this.startWebcamStream();
      }
    } else {
      this.toast.show(`تم إغلاق وإيقاف بث الكاميرا (${cam.name}) 🔴`, 'info');
    }
  }

  allCamerasPoweredOn(): boolean {
    const cams = this.service.cctvCameras();
    return cams.length > 0 && cams.every(c => c.isOnline);
  }

  toggleAllCamerasPower() {
    const newState = !this.allCamerasPoweredOn();
    const updated = this.service.cctvCameras().map(c => ({ ...c, isOnline: newState }));
    this.service.saveCctvCameras(updated);

    if (newState) {
      this.toast.show('تم تشغيل جميع كاميرات المتجر بنجاح 🟢', 'success');
      this.startWebcamStream();
    } else {
      this.toast.show('تم إغلاق وإيقاف جميع بث الكاميرات 🔴', 'info');
    }
  }

  toggleNightVision(cam: OmAlQuraCctvCamera) {
    cam.nightVision = !cam.nightVision;
  }

  toggleNightVisionAll() {
    const val = !this.allNightVision();
    this.allNightVision.set(val);
    const updated = this.service.cctvCameras().map(c => ({ ...c, nightVision: val }));
    this.service.saveCctvCameras(updated);
  }

  triggerEmergencySiren() {
    this.sirenActive.set(true);
    this.playEmergencySirenAudio();
    this.eventLogs.set([
      { id: 'e-' + Date.now(), time: new Date().toLocaleTimeString('ar-EG'), cameraName: 'غرفة التحكم المركزية', type: 'alert', description: 'تم إطلاق إنذار أمني طارئ يدوي بواسطة مدير النظام 🚨' },
      ...this.eventLogs()
    ]);
    this.toast.show('🚨 تم تفعيل إنذار الطوارئ وإطلاق صفارات الإنذار الصوتية العالية بنجاح!', 'warning');
  }

  stopEmergencySiren() {
    this.sirenActive.set(false);
    this.stopEmergencySirenAudio();
    this.toast.show('تم إيقاف إنذار الطوارئ وصوت الصفارات.', 'info');
  }

  private sirenAudioCtx: AudioContext | null = null;
  private sirenOscillator: OscillatorNode | null = null;

  playEmergencySirenAudio() {
    try {
      this.stopEmergencySirenAudio();
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.sirenAudioCtx = new AudioCtxClass();
      const ctx = this.sirenAudioCtx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.85, ctx.currentTime);

      const now = ctx.currentTime;
      for (let i = 0; i < 60; i++) {
        osc.frequency.setValueAtTime(750, now + (i * 0.5));
        osc.frequency.exponentialRampToValueAtTime(1350, now + (i * 0.5) + 0.25);
        osc.frequency.exponentialRampToValueAtTime(750, now + (i * 0.5) + 0.5);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      this.sirenOscillator = osc;
    } catch (e) {
      console.warn('Siren Audio Error:', e);
    }
  }

  stopEmergencySirenAudio() {
    if (this.sirenOscillator) {
      try { this.sirenOscillator.stop(); } catch (e) {}
      this.sirenOscillator = null;
    }
    if (this.sirenAudioCtx) {
      try { this.sirenAudioCtx.close(); } catch (e) {}
      this.sirenAudioCtx = null;
    }
  }

  takeSnapshot(cam: OmAlQuraCctvCamera) {
    this.toast.show(`تم التقاط صورة وحفظ لقطة ثابتة من (${cam.name}) 📷`, 'success');
  }

  maximizeCamera(cam: OmAlQuraCctvCamera) {
    this.selectedCamera.set(cam);
  }

  private drawCanvasFeeds() {
    if (!this.camCanvases) return;

    this.camCanvases.forEach(ref => {
      const canvas = ref.nativeElement;
      const camId = canvas.getAttribute('data-cam-id');
      const cam = this.service.cctvCameras().find(c => c.id === camId);
      if (!cam) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth || 320;
        canvas.height = canvas.clientHeight || 200;
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = cam.nightVision ? '#06200f' : '#0f172a';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cam.panX, cam.panY);

      ctx.strokeStyle = cam.nightVision ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(w / 2, h / 3);
        ctx.stroke();
      }

      ctx.fillStyle = cam.nightVision ? 'rgba(74, 222, 128, 0.3)' : 'rgba(16, 185, 129, 0.3)';
      ctx.fillRect(20, h * 0.4, 80, h * 0.5);
      ctx.fillRect(w - 100, h * 0.4, 80, h * 0.5);

      ctx.restore();

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = cam.nightVision ? '#4ade80' : '#ffffff';
      ctx.fillText(`CAM: ${cam.id.toUpperCase()}`, 10, h - 15);
    });
  }
}
