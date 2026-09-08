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

  // ── Power & Resources ──
  power: {
    getStatus: () => ipcRenderer.invoke('power:get-status')
  },

  // ── File Processing ──
  fileProcessing: {
    process: (filePath, mode) => ipcRenderer.invoke('fs:process-file', { filePath, mode })
  },

  // ── Dialogs ──
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:open-file', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:save-file', options),
    openDirectory: () => ipcRenderer.invoke('dialog:open-directory')
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
  },

  // ── Local Player Native Disk Persistence ──
  localPlayer: {
    saveState: (state) => ipcRenderer.invoke('local-player:save-state', state),
    loadState: () => ipcRenderer.invoke('local-player:load-state')
  },

  // ── Device File Manager (Explicit Folder Access) ──
  deviceFS: {
    selectDirectory: () => ipcRenderer.invoke('device-fs:select-directory'),
    list: (dirPath) => ipcRenderer.invoke('device-fs:list', dirPath),
    openPath: (targetPath) => ipcRenderer.invoke('device-fs:open-path', targetPath),
    showInFolder: (targetPath) => ipcRenderer.invoke('device-fs:show-in-folder', targetPath),
    trash: (targetPath) => ipcRenderer.invoke('device-fs:trash', targetPath),
    delete: (targetPath) => ipcRenderer.invoke('device-fs:delete', targetPath),
    rename: (oldPath, newPath) => ipcRenderer.invoke('device-fs:rename', { oldPath, newPath }),
    copy: (srcPath, destPath) => ipcRenderer.invoke('device-fs:copy', { srcPath, destPath }),
    createFolder: (folderPath) => ipcRenderer.invoke('device-fs:create-folder', folderPath)
  }
});
