'use strict';

const { spawn, exec } = require('child_process');
const { dialog, shell, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const http = require('http');

// ─────────────────────────────────────────
//  Inkscape Download URLs (latest stable)
// ─────────────────────────────────────────
const INKSCAPE_RELEASES = {
  win32: {
    url: 'https://inkscape.org/gallery/item/44616/inkscape-1.4_2024-10-11_86a8ad7-x64.exe',
    filename: 'inkscape-setup.exe',
    size: '~100 MB'
  },
  darwin: {
    url: 'https://inkscape.org/gallery/item/44612/inkscape-1.4_2024-10-11_86a8ad7.dmg',
    filename: 'inkscape.dmg',
    size: '~200 MB'
  },
  linux: {
    url: 'https://inkscape.org/gallery/item/44606/inkscape-1.4.tar.xz',
    filename: 'inkscape.tar.xz',
    size: '~90 MB'
  }
};

// ─────────────────────────────────────────
//  Known Inkscape install paths
// ─────────────────────────────────────────
const INKSCAPE_PATHS = {
  win32: [
    'C:\\Program Files\\Inkscape\\bin\\inkscape.exe',
    'C:\\Program Files (x86)\\Inkscape\\inkscape.exe',
    'C:\\Program Files\\Inkscape\\inkscape.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Inkscape', 'bin', 'inkscape.exe'),
  ],
  darwin: [
    '/Applications/Inkscape.app/Contents/MacOS/inkscape',
    '/usr/local/bin/inkscape',
    '/opt/homebrew/bin/inkscape'
  ],
  linux: [
    '/usr/bin/inkscape',
    '/usr/local/bin/inkscape',
    '/snap/bin/inkscape',
    '/opt/inkscape/bin/inkscape'
  ]
};

// File watchers registry
const watchers = new Map();

// ─────────────────────────────────────────
//  Detect Inkscape
// ─────────────────────────────────────────
async function detect() {
  const platform = process.platform;
  const paths = INKSCAPE_PATHS[platform] || INKSCAPE_PATHS.linux;

  // Check known paths
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const version = await getVersion(p);
      return { found: true, path: p, version };
    }
  }

  // Try PATH lookup
  try {
    const found = await findInPath('inkscape');
    if (found) {
      const version = await getVersion(found);
      return { found: true, path: found, version };
    }
  } catch (_) {}

  // Check registry on Windows
  if (platform === 'win32') {
    try {
      const regPath = await checkRegistry();
      if (regPath) {
        const version = await getVersion(regPath);
        return { found: true, path: regPath, version };
      }
    } catch (_) {}
  }

  return { found: false, path: null, version: null };
}

function getVersion(inkscapePath) {
  return new Promise((resolve) => {
    exec(`"${inkscapePath}" --version`, { timeout: 5000 }, (err, stdout) => {
      if (err) { resolve('Unknown'); return; }
      const match = stdout.match(/Inkscape\s+([\d.]+)/i);
      resolve(match ? match[1] : stdout.trim().split('\n')[0]);
    });
  });
}

function findInPath(cmd) {
  return new Promise((resolve, reject) => {
    const which = process.platform === 'win32' ? 'where' : 'which';
    exec(`${which} ${cmd}`, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim().split('\n')[0]);
    });
  });
}

function checkRegistry() {
  return new Promise((resolve) => {
    exec(
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\inkscape.exe" /ve',
      (err, stdout) => {
        if (err) { resolve(null); return; }
        const match = stdout.match(/REG_SZ\s+(.+)/);
        resolve(match ? match[1].trim() : null);
      }
    );
  });
}

// ─────────────────────────────────────────
//  Open Inkscape (empty or with file)
// ─────────────────────────────────────────
async function openInkscape() {
  const result = await detect();
  if (!result.found) {
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'Inkscape غير مثبت',
      message: 'Inkscape غير موجود على هذا الجهاز',
      detail: 'هل تريد تحميل وتثبيت Inkscape الآن؟\n(سيتم التحميل تلقائياً ~100MB)',
      buttons: ['تحميل وتثبيت', 'إلغاء'],
      defaultId: 0
    });
    if (response === 0) {
      await downloadAndInstall(BrowserWindow.getFocusedWindow());
    }
    return { ok: false, reason: 'not_installed' };
  }

  spawn(result.path, [], { detached: true, stdio: 'ignore' }).unref();
  return { ok: true };
}

async function openFile(filePath) {
  const result = await detect();
  if (!result.found) {
    // Try to use shell.openWith as fallback
    try {
      shell.openPath(filePath);
      return { ok: true, fallback: true };
    } catch (_) {}
    return { ok: false, reason: 'not_installed' };
  }

  const args = [filePath];
  spawn(result.path, args, { detached: true, stdio: 'ignore' }).unref();
  return { ok: true, path: result.path };
}

// ─────────────────────────────────────────
//  Download & Install Inkscape
// ─────────────────────────────────────────
async function downloadAndInstall(win, progressCallback) {
  const platform = process.platform;
  const release = INKSCAPE_RELEASES[platform];

  if (!release) {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Inkscape',
      message: 'يرجى تحميل Inkscape يدوياً',
      detail: 'https://inkscape.org/release/'
    });
    shell.openExternal('https://inkscape.org/release/');
    return { ok: false, reason: 'unsupported_auto_install' };
  }

  // Progress window
  let progressWin = new BrowserWindow({
    width: 480,
    height: 280,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  const progressHTML = `
    <!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#1e1e2e; color:white; font-family:system-ui; padding:32px; border-radius:12px; }
      h2 { font-size:18px; margin-bottom:8px; color:#a78bfa; }
      p { color:#94a3b8; font-size:13px; margin-bottom:24px; }
      .bar-wrap { background:rgba(255,255,255,.1); border-radius:8px; height:8px; overflow:hidden; margin-bottom:12px; }
      .bar { height:100%; background:linear-gradient(90deg,#7c3aed,#6366f1); border-radius:8px; transition:width .3s; width:0%; }
      .status { font-size:12px; color:#64748b; }
      .cancel { margin-top:20px; padding:8px 16px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:6px; color:#94a3b8; cursor:pointer; }
      .cancel:hover { background:rgba(255,255,255,.1); }
    </style></head>
    <body>
      <h2>⬇️ تحميل Inkscape</h2>
      <p>الحجم التقريبي: ${release.size}</p>
      <div class="bar-wrap"><div class="bar" id="bar"></div></div>
      <div class="status" id="status">جاري التحميل...</div>
      <button class="cancel" onclick="window.close()">إلغاء</button>
      <script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('download-progress', (_, data) => {
          document.getElementById('bar').style.width = data.percent + '%';
          document.getElementById('status').textContent = data.message;
        });
      </script>
    </body></html>
  `;

  const htmlPath = path.join(os.tmpdir(), 'inkscape-progress.html');
  fs.writeFileSync(htmlPath, progressHTML, 'utf-8');
  progressWin.loadFile(htmlPath);
  progressWin.setMenuBarVisibility(false);

  const sendProgress = (percent, message) => {
    if (progressCallback) progressCallback({ percent, message });
    if (!progressWin.isDestroyed()) {
      progressWin.webContents.send('download-progress', { percent, message });
    }
  };

  try {
    const downloadDir = path.join(os.tmpdir(), 'super-inkscape-dl');
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
    const destPath = path.join(downloadDir, release.filename);

    sendProgress(5, 'جاري الاتصال بخادم Inkscape...');

    await downloadFile(release.url, destPath, (downloaded, total) => {
      const pct = total > 0 ? Math.round((downloaded / total) * 85) + 5 : 50;
      const mb = (downloaded / 1024 / 1024).toFixed(1);
      const totalMb = total > 0 ? (total / 1024 / 1024).toFixed(0) : '?';
      sendProgress(pct, `تم تحميل ${mb} MB من ${totalMb} MB`);
    });

    sendProgress(90, 'جاري التثبيت... (قد يستغرق بعض الوقت)');

    if (platform === 'win32') {
      await runInstaller(destPath);
    } else if (platform === 'darwin') {
      await mountDmg(destPath);
    }

    sendProgress(100, '✅ تم تثبيت Inkscape بنجاح!');

    setTimeout(() => {
      if (!progressWin.isDestroyed()) progressWin.close();
    }, 2000);

    return { ok: true };
  } catch (error) {
    sendProgress(0, `❌ فشل التحميل: ${error.message}`);
    console.error('Inkscape download failed:', error);

    setTimeout(() => {
      if (!progressWin.isDestroyed()) progressWin.close();
      dialog.showMessageBox(win, {
        type: 'error',
        title: 'فشل التحميل',
        message: 'تعذر تحميل Inkscape تلقائياً',
        detail: `${error.message}\n\nيمكنك تحميله يدوياً من:\nhttps://inkscape.org/release/`,
        buttons: ['فتح موقع Inkscape', 'إغلاق']
      }).then(({ response }) => {
        if (response === 0) shell.openExternal('https://inkscape.org/release/');
      });
    }, 1500);

    return { ok: false, error: error.message };
  }
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloaded = 0;
    let total = 0;

    const makeRequest = (requestUrl) => {
      const proto = requestUrl.startsWith('https') ? https : http;
      proto.get(requestUrl, (res) => {
        // Follow redirects
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
          file.close();
          return makeRequest(res.headers.location);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        total = parseInt(res.headers['content-length'] || '0', 10);
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (onProgress) onProgress(downloaded, total);
        });
        res.pipe(file);
        res.on('end', () => { file.close(); resolve(); });
        res.on('error', reject);
      }).on('error', reject);
    };

    makeRequest(url);
  });
}

function runInstaller(installerPath) {
  return new Promise((resolve, reject) => {
    // Run installer silently
    const proc = spawn(installerPath, ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], {
      detached: true,
      stdio: 'ignore'
    });
    proc.on('close', (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`Installer exited with code ${code}`));
    });
    proc.on('error', reject);
    // Detach so it can run independently
    proc.unref();
    // Give it time to start
    setTimeout(resolve, 3000);
  });
}

function mountDmg(dmgPath) {
  return new Promise((resolve, reject) => {
    exec(`hdiutil attach "${dmgPath}" -quiet`, (err) => {
      if (err) reject(err);
      else {
        exec('cp -R /Volumes/Inkscape/Inkscape.app /Applications/', (err2) => {
          exec('hdiutil detach /Volumes/Inkscape -quiet');
          if (err2) reject(err2);
          else resolve();
        });
      }
    });
  });
}

// ─────────────────────────────────────────
//  File Watcher
// ─────────────────────────────────────────
function watchFile(filePath, callback) {
  // Stop existing watcher if any
  if (watchers.has(filePath)) {
    watchers.get(filePath).close();
  }

  let lastMtime = null;
  const watcher = fs.watch(filePath, { persistent: false }, (eventType) => {
    if (eventType === 'change') {
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs !== lastMtime) {
          lastMtime = stat.mtimeMs;
          setTimeout(() => {
            try {
              const content = fs.readFileSync(filePath, 'utf-8');
              callback(content);
            } catch (_) {}
          }, 300); // debounce
        }
      } catch (_) {}
    }
  });

  watchers.set(filePath, watcher);
  return () => {
    watcher.close();
    watchers.delete(filePath);
  };
}

function cleanup() {
  for (const [, watcher] of watchers) {
    try { watcher.close(); } catch (_) {}
  }
  watchers.clear();
}

// ─────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────
module.exports = {
  detect,
  openInkscape,
  openFile,
  downloadAndInstall,
  watchFile,
  cleanup
};
