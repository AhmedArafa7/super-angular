# 🖥️ Super - Desktop App (Electron)

## هيكل مجلد Electron

```
electron/
├── main.js          ← العملية الرئيسية (BrowserWindow، IPC، Tray)
├── preload.js       ← جسر IPC آمن للـ Angular
├── inkscape.js      ← اكتشاف وتحميل وتشغيل Inkscape
├── create-icon.js   ← سكريبت إعداد الأيقونات
└── assets/
    ├── icon.png     ← أيقونة التطبيق (512x512)
    ├── icon.ico     ← أيقونة Windows
    └── tray-icon.png ← أيقونة شريط المهام
```

## أوامر التشغيل

### تطوير (Dev Mode)
```bash
# الطريقة 1: يشتغل مع Angular dev server
npm run electron:dev

# الطريقة 2: يدوي (يجب تشغيل ng serve أولاً)
npm run start        # في terminal 1
npm run electron:start  # في terminal 2
```

### بناء وتحزيم

```bash
# بناء Angular ثم تحزيم كـ Windows installer
npm run electron:build

# بناء فقط بدون installer (للاختبار)
npm run electron:pack
```

## APIs المتاحة في Angular (window.electronAPI)

```typescript
// كشف Inkscape
const result = await window.electronAPI.inkscape.detect();
// { found: true, path: "C:\\...\\inkscape.exe", version: "1.4" }

// فتح ملف SVG في Inkscape
await window.electronAPI.inkscape.open("C:\\temp\\drawing.svg");

// تحميل وتثبيت Inkscape
await window.electronAPI.inkscape.download();

// حفظ SVG في ملف مؤقت
const saved = await window.electronAPI.fs.saveSVG(svgContent, "drawing.svg");

// مراقبة تغييرات الملف (التزامن مع Inkscape)
await window.electronAPI.inkscape.watch(filePath);
window.electronAPI.inkscape.onFileChanged((data) => {
  console.log("File changed!", data.content);
});

// Dialog لفتح ملف
const filePath = await window.electronAPI.dialog.openFile({
  filters: [{ name: "SVG", extensions: ["svg"] }]
});

// تحكم في النافذة
window.electronAPI.window.minimize();
window.electronAPI.window.maximize();
window.electronAPI.window.close();
```

## ملاحظات
- في **web mode** (المتصفح): `window.electronAPI` = undefined، الـ ElectronService يتعامل معها بـ fallback
- في **Electron**: `window.electronAPI.isElectron` = true
- Inkscape يُفتح في **نافذة مستقلة** منفصلة
- التزامن التلقائي: حفظ في Inkscape → يُستورد تلقائياً في Super
