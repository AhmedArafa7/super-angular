'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ─────────────────────────────────────────
//  Expose safe Electron APIs to Angular
// ─────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Identity ──
  isElectron: true,
  platform: process.platform,

  // ── Inkscape ──
  inkscape: {
    detect: () => ipcRenderer.invoke('inkscape:detect'),
    open: (filePath) => ipcRenderer.invoke('inkscape:open', filePath),
    openEmpty: () => ipcRenderer.invoke('inkscape:open-empty'),
    download: () => ipcRenderer.invoke('inkscape:download'),
    watch: (filePath) => ipcRenderer.invoke('inkscape:watch', filePath),
    onProgress: (callback) => {
      ipcRenderer.on('inkscape:download-progress', (_, data) => callback(data));
    },
    onFileChanged: (callback) => {
      ipcRenderer.on('inkscape:file-changed', (_, data) => callback(data));
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('inkscape:download-progress');
      ipcRenderer.removeAllListeners('inkscape:file-changed');
    }
  },

  // ── File System ──
  fs: {
    saveSVG: (content, filename) => ipcRenderer.invoke('fs:save-svg', { content, filename }),
    readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', { filePath, content })
  },

  // ── Dialogs ──
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:open-file', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options)
  },

  // ── App Info ──
  app: {
    getInfo: () => ipcRenderer.invoke('app:info'),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url)
  },

  // ── Window Controls ──
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
});
