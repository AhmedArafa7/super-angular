'use strict';

const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage, shell, powerMonitor } = require('electron');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const os = require('os');
const inkscapeManager = require('./inkscape');

// ─────────────────────────────────────────
//  Environment
// ─────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const ANGULAR_DEV_URL = 'http://localhost:4200';
const ANGULAR_PROD_FILE = path.join(__dirname, '..', 'dist', 'Super-Angular', 'browser', 'index.html');

let mainWindow = null;
let tray = null;
let splashWindow = null;

// ─────────────────────────────────────────
//  Splash Screen
// ─────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          width:480px; height:300px;
          background:linear-gradient(135deg,#1e1e2e,#2d1b69);
          border-radius:16px; overflow:hidden;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          color:white; font-family:system-ui,sans-serif;
          border:1px solid rgba(124,58,237,.4);
          box-shadow:0 25px 60px rgba(0,0,0,.8);
          -webkit-app-region:no-drag;
        }
        .logo { font-size:48px; margin-bottom:12px; }
        h1 { font-size:28px; font-weight:800; letter-spacing:-1px; margin-bottom:4px; }
        p { color:rgba(255,255,255,.5); font-size:13px; margin-bottom:24px; }
        .bar-wrap { width:280px; height:4px; background:rgba(255,255,255,.1); border-radius:4px; overflow:hidden; }
        .bar { height:100%; background:linear-gradient(90deg,#7c3aed,#6366f1); border-radius:4px;
               animation:load 2s ease-in-out forwards; }
        @keyframes load { from{width:0} to{width:100%} }
        .version { margin-top:12px; font-size:11px; color:rgba(255,255,255,.3); }
      </style>
    </head>
    <body>
      <div class="logo">⚡</div>
      <h1>Super</h1>
      <p>جاري التحميل...</p>
      <div class="bar-wrap"><div class="bar"></div></div>
      <div class="version">v${app.getVersion()}</div>
    </body>
    </html>
  `;

  const splashPath = path.join(os.tmpdir(), 'super-splash.html');
  fs.writeFileSync(splashPath, splashHTML, 'utf-8');
  splashWindow.loadFile(splashPath);
}

// ─────────────────────────────────────────
//  Main Window
// ─────────────────────────────────────────
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#181825',
      symbolColor: '#94a3b8',
      height: 32
    },
    backgroundColor: '#1e1e2e',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      sandbox: false
    }
  });

  // Native application menu
  buildMenu();

  // Load Angular
  if (isDev) {
    mainWindow.loadURL(ANGULAR_DEV_URL).catch(() => {
      console.log('Dev server not running, falling back to production build...');
      mainWindow.loadFile(ANGULAR_PROD_FILE);
    });
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(ANGULAR_PROD_FILE);
  }

  mainWindow.webContents.on('did-fail-load', async (event, errorCode) => {
    if (isDev && (errorCode === -102 || errorCode === -105)) {
      console.log('Localhost:4200 not available, loading production build file...');
      try {
        await mainWindow.loadFile(ANGULAR_PROD_FILE);
      } catch (err) {
        console.error('Failed to load production file:', err);
      }
    }
  });

  // Show window after load (hide splash)
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      setTimeout(() => {
        splashWindow.close();
        splashWindow = null;
        mainWindow.show();
        mainWindow.focus();
      }, 500);
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Create tray
  setupTray();
}

// ─────────────────────────────────────────
//  Native Menu
// ─────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'Super',
      submenu: [
        { label: 'عن التطبيق', click: () => showAbout() },
        { type: 'separator' },
        { label: 'إخفاء', role: 'hide' },
        { type: 'separator' },
        { label: 'إغلاق', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'ملف',
      submenu: [
        { label: 'تصغير', role: 'minimize' },
        { label: 'ملء الشاشة', role: 'togglefullscreen', accelerator: 'F11' },
        { type: 'separator' },
        { label: 'إعادة التحميل', role: 'reload', accelerator: 'Ctrl+R' }
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'zoomIn', label: 'تكبير', accelerator: 'Ctrl+=' },
        { role: 'zoomOut', label: 'تصغير', accelerator: 'Ctrl+-' },
        { role: 'resetZoom', label: 'الحجم الافتراضي', accelerator: 'Ctrl+0' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة', accelerator: 'F11' }
      ]
    },
    {
      label: 'Inkscape',
      submenu: [
        {
          label: 'فتح Inkscape',
          accelerator: 'Ctrl+Shift+I',
          click: () => inkscapeManager.openInkscape()
        },
        {
          label: 'تحميل وتثبيت Inkscape',
          click: () => inkscapeManager.downloadAndInstall(mainWindow)
        },
        { type: 'separator' },
        {
          label: 'اكتشاف Inkscape',
          click: async () => {
            const result = await inkscapeManager.detect();
            dialog.showMessageBox(mainWindow, {
              type: result.found ? 'info' : 'warning',
              title: 'Inkscape',
              message: result.found
                ? `✅ Inkscape مثبت في:\n${result.path}`
                : '❌ Inkscape غير مثبت على هذا الجهاز'
            });
          }
        }
      ]
    },
    {
      label: 'مساعدة',
      submenu: [
        { label: 'الموقع الرسمي', click: () => shell.openExternal('https://github.com/inkscape/inkscape') },
        { label: 'التبليغ عن مشكلة', click: () => shell.openExternal('https://github.com/AhmedArafa7/super-angular/issues') }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─────────────────────────────────────────
//  System Tray
// ─────────────────────────────────────────
function setupTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
    const trayIcon = fs.existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
      : nativeImage.createEmpty();

    tray = new Tray(trayIcon);
    tray.setToolTip('Super App');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'فتح Super', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: 'Inkscape', click: () => inkscapeManager.openInkscape() },
      { type: 'separator' },
      { label: 'إغلاق', click: () => app.quit() }
    ]));
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (e) {
    console.warn('Tray setup failed:', e.message);
  }
}

// ─────────────────────────────────────────
//  About Dialog
// ─────────────────────────────────────────
function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'عن Super',
    message: '⚡ Super',
    detail: `الإصدار: ${app.getVersion()}\nبيئة العمل: Electron ${process.versions.electron}\nNode.js: ${process.versions.node}\n\nمنصة متكاملة تشمل محرر SVG وأدوات إنتاجية متعددة.`
  });
}

// ─────────────────────────────────────────
//  IPC Handlers
// ─────────────────────────────────────────

// ── Power & Resources ──
ipcMain.handle('power:get-status', () => {
  return {
    onBattery: powerMonitor.isOnBatteryPower()
  };
});

// ── File Processing ──
ipcMain.handle('fs:process-file', async (_, { filePath, mode }) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);
    
    if (ext === '.pdf') {
      if (mode === 'text') {
        const data = await pdfParse(buffer);
        return { ok: true, content: data.text, type: 'text' };
      } else if (mode === 'advanced') {
        // Here you would implement layout preservation if possible
        // For now, let's return a placeholder or do minimal text extraction
        const data = await pdfParse(buffer);
        return { ok: true, content: data.text, type: 'advanced' };
      }
    }
    return { ok: false, error: 'Unsupported file type or mode' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('inkscape:open', async (_, filePath) => {
  return await inkscapeManager.openFile(filePath);
});

ipcMain.handle('inkscape:open-empty', async () => {
  return await inkscapeManager.openInkscape();
});

ipcMain.handle('inkscape:download', async (event) => {
  return await inkscapeManager.downloadAndInstall(mainWindow, (progress) => {
    event.sender.send('inkscape:download-progress', progress);
  });
});

ipcMain.handle('inkscape:watch', async (event, filePath) => {
  inkscapeManager.watchFile(filePath, (newContent) => {
    event.sender.send('inkscape:file-changed', { path: filePath, content: newContent });
  });
  return { ok: true };
});

// ── File System ──
ipcMain.handle('fs:save-svg', async (_, { content, filename }) => {
  try {
    const tmpDir = path.join(os.tmpdir(), 'super-inkscape');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, filename || `drawing_${Date.now()}.svg`);
    fs.writeFileSync(filePath, content, 'utf-8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('fs:read-file', async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('fs:write-file', async (_, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── Dialogs ──
ipcMain.handle('dialog:open-file', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'فتح ملف',
    filters: options?.filters || [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:save-file', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'حفظ ملف',
    defaultPath: options?.defaultPath || `drawing_${Date.now()}.svg`,
    filters: options?.filters || [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'PNG Files', extensions: ['png'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});

// ── App Info ──
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  node: process.versions.node,
  platform: process.platform,
  isDev
}));

ipcMain.handle('app:open-external', (_, url) => {
  shell.openExternal(url);
});

// ── Window Controls ──
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

// ─────────────────────────────────────────
//  App Lifecycle
// ─────────────────────────────────────────
app.whenReady().then(async () => {
  createSplash();
  // Small delay so splash shows
  setTimeout(createMainWindow, 800);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  inkscapeManager.cleanup();
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
