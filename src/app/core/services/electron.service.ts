import { Injectable, signal, computed } from '@angular/core';

// ─────────────────────────────────────────
//  Types
// ─────────────────────────────────────────
export interface InkscapeDetectResult {
  found: boolean;
  path: string | null;
  version: string | null;
}

export interface DownloadProgress {
  percent: number;
  message: string;
}

export interface DeviceFsItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
  createdAt?: number;
  extension: string;
  inaccessible?: boolean;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  inkscape: {
    detect: () => Promise<InkscapeDetectResult>;
    open: (filePath: string) => Promise<{ ok: boolean; reason?: string }>;
    openEmpty: () => Promise<{ ok: boolean; reason?: string }>;
    download: () => Promise<{ ok: boolean; error?: string }>;
    watch: (filePath: string) => Promise<{ ok: boolean }>;
    onProgress: (cb: (data: DownloadProgress) => void) => void;
    onFileChanged: (cb: (data: { path: string; content: string }) => void) => void;
    removeListeners: () => void;
  };
  fs: {
    saveSVG: (content: string, filename?: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
    readFile: (path: string) => Promise<{ ok: boolean; content?: string; error?: string }>;
    writeFile: (path: string, content: string) => Promise<{ ok: boolean; error?: string }>;
  };
  dialog: {
    openFile: (opts?: any) => Promise<string | null>;
    saveFile: (opts?: any) => Promise<string | null>;
  };
  deviceFS?: {
    selectDirectory: () => Promise<string | null>;
    list: (dirPath: string) => Promise<{ ok: boolean; items?: DeviceFsItem[]; error?: string }>;
    openPath: (targetPath: string) => Promise<{ ok: boolean; error?: string }>;
    showInFolder: (targetPath: string) => Promise<{ ok: boolean; error?: string }>;
    trash: (targetPath: string) => Promise<{ ok: boolean; error?: string }>;
    delete: (targetPath: string) => Promise<{ ok: boolean; error?: string }>;
    rename: (oldPath: string, newPath: string) => Promise<{ ok: boolean; error?: string }>;
    copy: (srcPath: string, destPath: string) => Promise<{ ok: boolean; error?: string }>;
    createFolder: (folderPath: string) => Promise<{ ok: boolean; error?: string }>;
  };
  app: {
    getInfo: () => Promise<any>;
    openExternal: (url: string) => void;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// ─────────────────────────────────────────
//  Service
// ─────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ElectronService {
  // ── State ──
  readonly isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  readonly platform = window.electronAPI?.platform ?? 'browser';

  inkscapeStatus = signal<'unknown' | 'checking' | 'found' | 'not_found' | 'downloading' | 'installing'>('unknown');
  inkscapePath = signal<string | null>(null);
  inkscapeVersion = signal<string | null>(null);
  downloadProgress = signal<DownloadProgress | null>(null);

  inkscapeInstalled = computed(() => this.inkscapeStatus() === 'found');

  private get api(): ElectronAPI | undefined {
    return window.electronAPI;
  }

  // ─────────────────────────────────────
  //  Inkscape Detection
  // ─────────────────────────────────────
  async detectInkscape(): Promise<InkscapeDetectResult> {
    if (!this.isElectron) {
      return { found: false, path: null, version: null };
    }
    this.inkscapeStatus.set('checking');
    try {
      const result = await this.api!.inkscape.detect();
      if (result.found) {
        this.inkscapeStatus.set('found');
        this.inkscapePath.set(result.path);
        this.inkscapeVersion.set(result.version);
      } else {
        this.inkscapeStatus.set('not_found');
      }
      return result;
    } catch (e) {
      this.inkscapeStatus.set('not_found');
      return { found: false, path: null, version: null };
    }
  }

  // ─────────────────────────────────────
  //  Open SVG in Inkscape
  // ─────────────────────────────────────
  async openSvgInInkscape(svgContent: string, filename?: string): Promise<boolean> {
    if (!this.isElectron) {
      // Web fallback: download as SVG file
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename ?? 'drawing.svg';
      a.click();
      return false;
    }

    try {
      // Save SVG to temp file
      const saveResult = await this.api!.fs.saveSVG(svgContent, filename ?? 'drawing.svg');
      if (!saveResult.ok || !saveResult.path) return false;

      // Open in Inkscape
      const openResult = await this.api!.inkscape.open(saveResult.path);
      return openResult.ok;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────
  //  Open SVG + Watch for Changes
  // ─────────────────────────────────────
  async openSvgWithSync(
    svgContent: string,
    onChanged: (newContent: string) => void,
    filename?: string
  ): Promise<{ ok: boolean; path?: string }> {
    if (!this.isElectron) return { ok: false };

    try {
      const saveResult = await this.api!.fs.saveSVG(svgContent, filename ?? 'drawing.svg');
      if (!saveResult.ok || !saveResult.path) return { ok: false };

      // Start watching before opening
      await this.api!.inkscape.watch(saveResult.path);
      this.api!.inkscape.onFileChanged((data) => {
        if (data.path === saveResult.path) {
          onChanged(data.content);
        }
      });

      // Open in Inkscape
      const openResult = await this.api!.inkscape.open(saveResult.path);
      return { ok: openResult.ok, path: saveResult.path };
    } catch {
      return { ok: false };
    }
  }

  // ─────────────────────────────────────
  //  Download & Install Inkscape
  // ─────────────────────────────────────
  async downloadInkscape(): Promise<boolean> {
    if (!this.isElectron) {
      window.open('https://inkscape.org/release/', '_blank');
      return false;
    }

    this.inkscapeStatus.set('downloading');
    this.downloadProgress.set({ percent: 0, message: 'جاري التهيئة...' });

    // Listen for progress updates
    this.api!.inkscape.onProgress((data) => {
      this.downloadProgress.set(data);
      if (data.percent >= 90) {
        this.inkscapeStatus.set('installing');
      }
    });

    try {
      const result = await this.api!.inkscape.download();
      if (result.ok) {
        this.downloadProgress.set({ percent: 100, message: '✅ تم التثبيت بنجاح!' });
        // Re-detect after install
        setTimeout(() => this.detectInkscape(), 2000);
        return true;
      } else {
        this.inkscapeStatus.set('not_found');
        this.downloadProgress.set(null);
        return false;
      }
    } catch {
      this.inkscapeStatus.set('not_found');
      this.downloadProgress.set(null);
      return false;
    } finally {
      this.api?.inkscape.removeListeners();
    }
  }

  // ─────────────────────────────────────
  //  File System
  // ─────────────────────────────────────
  async openFileDialog(filters?: any[]): Promise<string | null> {
    if (!this.isElectron) return null;
    return this.api!.dialog.openFile({ filters });
  }

  async saveFileDialog(defaultPath?: string, filters?: any[]): Promise<string | null> {
    if (!this.isElectron) return null;
    return this.api!.dialog.saveFile({ defaultPath, filters });
  }

  async readFile(filePath: string): Promise<string | null> {
    if (!this.isElectron) return null;
    const result = await this.api!.fs.readFile(filePath);
    return result.ok ? (result.content ?? null) : null;
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    if (!this.isElectron) return false;
    const result = await this.api!.fs.writeFile(filePath, content);
    return result.ok;
  }

  // ─────────────────────────────────────
  //  Device File System Access
  // ─────────────────────────────────────
  async selectDirectory(): Promise<string | null> {
    if (!this.isElectron || !this.api?.deviceFS) return null;
    return this.api.deviceFS.selectDirectory();
  }

  async listDirectory(dirPath: string): Promise<{ ok: boolean; items?: DeviceFsItem[]; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.list(dirPath);
  }

  async openDevicePath(targetPath: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.openPath(targetPath);
  }

  async showInFolder(targetPath: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.showInFolder(targetPath);
  }

  async trashDeviceItem(targetPath: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.trash(targetPath);
  }

  async deleteDeviceItem(targetPath: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.delete(targetPath);
  }

  async renameDeviceItem(oldPath: string, newPath: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.rename(oldPath, newPath);
  }

  async copyDeviceItem(srcPath: string, destPath: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.copy(srcPath, destPath);
  }

  async createDeviceFolder(folderPath: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.isElectron || !this.api?.deviceFS) return { ok: false, error: 'غير متوفر في المتصفح' };
    return this.api.deviceFS.createFolder(folderPath);
  }

  // ─────────────────────────────────────
  //  Window Controls
  // ─────────────────────────────────────
  minimizeWindow(): void { this.api?.window.minimize(); }
  maximizeWindow(): void { this.api?.window.maximize(); }
  closeWindow(): void { this.api?.window.close(); }

  openExternal(url: string): void {
    if (this.isElectron) {
      this.api?.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }

  // ─────────────────────────────────────
  //  App Info
  // ─────────────────────────────────────
  async getAppInfo(): Promise<any> {
    if (!this.isElectron) {
      return { version: '1.0.0-web', platform: 'browser', electron: null };
    }
    return this.api!.app.getInfo();
  }

  cleanup(): void {
    this.api?.inkscape.removeListeners();
  }
}
