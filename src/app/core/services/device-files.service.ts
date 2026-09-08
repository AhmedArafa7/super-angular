import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronService, DeviceFsItem } from './electron.service';

export interface UnifiedFsItem {
  id: string;
  name: string;
  path?: string; // Available in Electron
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
  extension: string;
  handle?: any; // Web FileSystemHandle
  inaccessible?: boolean;
}

export interface BreadcrumbStep {
  name: string;
  path?: string;
  handle?: any;
}

export type SortField = 'name' | 'size' | 'modifiedAt' | 'extension';
export type SortDirection = 'asc' | 'desc';
export type FileCategory = 'all' | 'video' | 'audio' | 'image' | 'document' | 'archive' | 'folder';

@Injectable({
  providedIn: 'root'
})
export class DeviceFilesService {
  private electron = inject(ElectronService);

  readonly isElectron = this.electron.isElectron;
  readonly supportsWebFS = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // ── State ──
  currentPath = signal<string>('');
  currentDirName = signal<string>('');
  items = signal<UnifiedFsItem[]>([]);
  breadcrumbs = signal<BreadcrumbStep[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Progressive Permission Escalation ('read' = safe browsing, 'readwrite' = edit mode)
  permissionMode = signal<'read' | 'readwrite'>('read');

  // Sorting & Filtering
  searchQuery = signal<string>('');
  sortBy = signal<SortField>('name');
  sortDirection = signal<SortDirection>('asc');
  selectedCategory = signal<FileCategory>('all');

  // Clipboard for copy / cut
  clipboard = signal<{ item: UnifiedFsItem; action: 'copy' | 'cut' } | null>(null);

  // Web File System Handles
  private rootWebHandle: any = null;
  private currentWebHandle: any = null;

  // ── Computed Filtered & Sorted Items ──
  filteredItems = computed(() => {
    let list = this.items();
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const sort = this.sortBy();
    const dir = this.sortDirection();

    // 1. Filter by search query
    if (query) {
      list = list.filter(i => i.name.toLowerCase().includes(query) || i.extension.toLowerCase().includes(query));
    }

    // 2. Filter by category
    if (cat !== 'all') {
      list = list.filter(i => {
        if (cat === 'folder') return i.isDirectory;
        if (i.isDirectory) return false;
        return this.categorizeExtension(i.extension) === cat;
      });
    }

    // 3. Sort (Folders always on top, then sorted)
    return [...list].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let compare = 0;
      switch (sort) {
        case 'name':
          compare = a.name.localeCompare(b.name, 'ar', { sensitivity: 'base' });
          break;
        case 'size':
          compare = a.size - b.size;
          break;
        case 'modifiedAt':
          compare = a.modifiedAt - b.modifiedAt;
          break;
        case 'extension':
          compare = a.extension.localeCompare(b.extension);
          break;
      }
      return dir === 'asc' ? compare : -compare;
    });
  });

  // Statistics
  stats = computed(() => {
    const list = this.items();
    const foldersCount = list.filter(i => i.isDirectory).length;
    const files = list.filter(i => !i.isDirectory);
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    return {
      foldersCount,
      filesCount: files.length,
      totalBytes,
      formattedSize: this.formatBytes(totalBytes)
    };
  });

  // ── Public Actions ──

  /**
   * Request user to pick a directory explicitly
   */
  async selectDirectory(): Promise<boolean> {
    this.errorMessage.set(null);

    if (this.isElectron) {
      try {
        const selected = await this.electron.selectDirectory();
        if (!selected) return false;
        this.currentPath.set(selected);
        const folderName = selected.split(/[\/\\]/).filter(Boolean).pop() || selected;
        this.currentDirName.set(folderName);
        this.permissionMode.set('read');
        this.breadcrumbs.set([{ name: folderName, path: selected }]);
        await this.loadElectronDirectory(selected);
        return true;
      } catch (err: any) {
        this.errorMessage.set(err.message || 'تعذر فتح المجلد');
        return false;
      }
    } else if (this.supportsWebFS) {
      try {
        // Safe Read-First Browsing: Request read mode initially
        const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
        if (!handle) return false;
        this.rootWebHandle = handle;
        this.currentWebHandle = handle;
        this.permissionMode.set('read');
        this.currentDirName.set(handle.name);
        this.currentPath.set(handle.name);
        this.breadcrumbs.set([{ name: handle.name, handle }]);
        await this.loadWebDirectory(handle);
        return true;
      } catch (err: any) {
        if (err.name === 'AbortError') return false;
        this.errorMessage.set('تعذر الحصول على إذن فتح المجلد: ' + (err.message || ''));
        return false;
      }
    } else {
      this.errorMessage.set('متصفحك لا يدعم واجهة الوصول للملفات. يرجى استخدام متصفح Chrome/Edge أو تشغيل نسخة الحاسوب.');
      return false;
    }
  }

  /**
   * Refresh current folder
   */
  async refreshCurrentDirectory(): Promise<void> {
    if (this.isElectron) {
      if (this.currentPath()) {
        await this.loadElectronDirectory(this.currentPath());
      }
    } else if (this.currentWebHandle) {
      await this.loadWebDirectory(this.currentWebHandle);
    }
  }

  /**
   * Navigate into a child folder
   */
  async navigateIntoFolder(item: UnifiedFsItem): Promise<void> {
    if (!item.isDirectory) return;

    if (this.isElectron && item.path) {
      this.breadcrumbs.update(crumbs => [...crumbs, { name: item.name, path: item.path }]);
      this.currentPath.set(item.path);
      this.currentDirName.set(item.name);
      await this.loadElectronDirectory(item.path);
    } else if (this.currentWebHandle && item.handle) {
      this.breadcrumbs.update(crumbs => [...crumbs, { name: item.name, handle: item.handle }]);
      this.currentWebHandle = item.handle;
      this.currentDirName.set(item.name);
      await this.loadWebDirectory(item.handle);
    }
  }

  /**
   * Navigate to a specific breadcrumb index
   */
  async navigateToBreadcrumb(index: number): Promise<void> {
    const crumbs = this.breadcrumbs();
    if (index < 0 || index >= crumbs.length) return;
    const target = crumbs[index];
    const newCrumbs = crumbs.slice(0, index + 1);
    this.breadcrumbs.set(newCrumbs);

    if (this.isElectron && target.path) {
      this.currentPath.set(target.path);
      this.currentDirName.set(target.name);
      await this.loadElectronDirectory(target.path);
    } else if (target.handle) {
      this.currentWebHandle = target.handle;
      this.currentDirName.set(target.name);
      await this.loadWebDirectory(target.handle);
    }
  }

  /**
   * Navigate one level up
   */
  async navigateUp(): Promise<void> {
    const crumbs = this.breadcrumbs();
    if (crumbs.length > 1) {
      await this.navigateToBreadcrumb(crumbs.length - 2);
    }
  }

  // ── Progressive Permission Escalation (Read-First Architecture) ──

  /**
   * Request write permission escalation (Just-In-Time)
   */
  async ensureWritePermission(): Promise<{ granted: boolean; message?: string }> {
    if (this.permissionMode() === 'readwrite') {
      return { granted: true };
    }

    if (this.isElectron) {
      // In Electron, permission escalation is application-level safety consent
      this.permissionMode.set('readwrite');
      return { granted: true };
    }

    if (this.rootWebHandle) {
      try {
        // 1. Check if permission was already granted in this browser session
        if (typeof this.rootWebHandle.queryPermission === 'function') {
          const query = await this.rootWebHandle.queryPermission({ mode: 'readwrite' });
          if (query === 'granted') {
            this.permissionMode.set('readwrite');
            return { granted: true };
          }
        }

        // 2. Request browser permission escalation explicitly
        if (typeof this.rootWebHandle.requestPermission === 'function') {
          const request = await this.rootWebHandle.requestPermission({ mode: 'readwrite' });
          if (request === 'granted') {
            this.permissionMode.set('readwrite');
            return { granted: true };
          } else {
            return { 
              granted: false, 
              message: 'لم يتم منح إذن التعديل والكتابة للمجلد. ظلت ملفاتك في وضع القراءة الآمن والمحمي 🔒' 
            };
          }
        }
      } catch (err: any) {
        return { granted: false, message: 'تعذر طلب إذن التعديل من المتصفح: ' + (err.message || '') };
      }
    }

    return { granted: false, message: 'لا يوجد مجلد نشط حالياً' };
  }

  /**
   * Return back to read-only safety mode
   */
  setReadOnlyMode(): void {
    this.permissionMode.set('read');
  }

  /**
   * Toggle between read-only safety mode and edit mode
   */
  async togglePermissionMode(): Promise<{ granted: boolean; message: string }> {
    if (this.permissionMode() === 'readwrite') {
      this.setReadOnlyMode();
      return { granted: false, message: 'تم تفعيل وضع القراءة الآمن 🔒 (جميع الملفات محمية من أي تعديل)' };
    } else {
      const res = await this.ensureWritePermission();
      if (res.granted) {
        return { granted: true, message: 'تم تفعيل وضع التعديل 🔓 (يمكنك الآن الحذف والتسمية)' };
      }
      return { granted: false, message: res.message || 'تعذر تفعيل وضع التعديل' };
    }
  }

  /**
   * Move item to Windows Recycle Bin (Desktop) or warn on Web
   */
  async moveToRecycleBin(item: UnifiedFsItem): Promise<{ ok: boolean; message: string; isWebLimitation?: boolean }> {
    // 1. Ensure write permission before trashing
    const perm = await this.ensureWritePermission();
    if (!perm.granted) {
      return { ok: false, message: perm.message || 'الإجراء ملغي: المجلد في وضع القراءة الآمن' };
    }

    if (this.isElectron && item.path) {
      this.isLoading.set(true);
      const res = await this.electron.trashDeviceItem(item.path);
      this.isLoading.set(false);
      if (res.ok) {
        await this.refreshCurrentDirectory();
        return { ok: true, message: `تم نقل "${item.name}" إلى سلة مهملات الويندوز بنجاح 🗑️` };
      }
      return { ok: false, message: res.error || 'تعذر النقل لسلة المهملات' };
    }

    // Web cannot access Windows Recycle Bin
    return {
      ok: false,
      isWebLimitation: true,
      message: 'سلة مهملات الويندوز غير مدعومة في المتصفح لأسباب أمنية. الحذف في المتصفح هو حذف نهائي، أو يمكنك استخدام نسخة الحاسوب للحصول على حماية سلة المهملات.'
    };
  }

  /**
   * Permanently delete item
   */
  async permanentDelete(item: UnifiedFsItem): Promise<{ ok: boolean; message: string }> {
    // Ensure write permission before permanent delete
    const perm = await this.ensureWritePermission();
    if (!perm.granted) {
      return { ok: false, message: perm.message || 'الإجراء ملغي: المجلد في وضع القراءة الآمن' };
    }

    this.isLoading.set(true);

    if (this.isElectron && item.path) {
      const res = await this.electron.deleteDeviceItem(item.path);
      this.isLoading.set(false);
      if (res.ok) {
        await this.refreshCurrentDirectory();
        return { ok: true, message: `تم حذف "${item.name}" نهائياً من القرص الصلب ⚠️` };
      }
      return { ok: false, message: res.error || 'تعذر حذف الملف' };
    }

    if (this.currentWebHandle) {
      try {
        await this.currentWebHandle.removeEntry(item.name, { recursive: item.isDirectory });
        this.isLoading.set(false);
        await this.refreshCurrentDirectory();
        return { ok: true, message: `تم حذف "${item.name}" نهائياً من المجلد ⚠️` };
      } catch (err: any) {
        this.isLoading.set(false);
        return { ok: false, message: 'خطأ أثناء الحذف: ' + (err.message || '') };
      }
    }

    this.isLoading.set(false);
    return { ok: false, message: 'لا يوجد مجلد نشط' };
  }

  /**
   * Rename item
   */
  async renameItem(item: UnifiedFsItem, newName: string): Promise<{ ok: boolean; message: string }> {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === item.name) {
      return { ok: false, message: 'الاسم غير صالح أو مطابق للاسم الحالي' };
    }

    // Ensure write permission before renaming
    const perm = await this.ensureWritePermission();
    if (!perm.granted) {
      return { ok: false, message: perm.message || 'الإجراء ملغي: المجلد في وضع القراءة الآمن' };
    }

    this.isLoading.set(true);

    if (this.isElectron && item.path) {
      const sep = item.path.includes('\\') ? '\\' : '/';
      const parts = item.path.split(sep);
      parts[parts.length - 1] = trimmed;
      const newPath = parts.join(sep);

      const res = await this.electron.renameDeviceItem(item.path, newPath);
      this.isLoading.set(false);
      if (res.ok) {
        await this.refreshCurrentDirectory();
        return { ok: true, message: `تمت إعادة التسمية إلى "${trimmed}" بنجاح` };
      }
      return { ok: false, message: res.error || 'فشلت إعادة التسمية' };
    }

    if (this.currentWebHandle && item.handle) {
      try {
        // Modern Chromium supports handle.move()
        if (typeof item.handle.move === 'function') {
          await item.handle.move(trimmed);
        } else {
          // Fallback: read file, write new, delete old
          if (item.isDirectory) {
            this.isLoading.set(false);
            return { ok: false, message: 'إعادة تسمية المجلدات في المتصفح غير مدعومة من هذا المتصفح' };
          }
          const file = await item.handle.getFile();
          const newHandle = await this.currentWebHandle.getFileHandle(trimmed, { create: true });
          const writable = await newHandle.createWritable();
          await writable.write(await file.arrayBuffer());
          await writable.close();
          await this.currentWebHandle.removeEntry(item.name);
        }

        this.isLoading.set(false);
        await this.refreshCurrentDirectory();
        return { ok: true, message: `تمت إعادة التسمية إلى "${trimmed}" بنجاح` };
      } catch (err: any) {
        this.isLoading.set(false);
        return { ok: false, message: 'خطأ أثناء إعادة التسمية: ' + (err.message || '') };
      }
    }

    this.isLoading.set(false);
    return { ok: false, message: 'تعذر تنفيذ الإجراء' };
  }

  /**
   * Create new folder
   */
  async createFolder(folderName: string): Promise<{ ok: boolean; message: string }> {
    const trimmed = folderName.trim();
    if (!trimmed) return { ok: false, message: 'اسم المجلد مطلوب' };

    // Ensure write permission before creating folder
    const perm = await this.ensureWritePermission();
    if (!perm.granted) {
      return { ok: false, message: perm.message || 'الإجراء ملغي: المجلد في وضع القراءة الآمن' };
    }

    this.isLoading.set(true);

    if (this.isElectron && this.currentPath()) {
      const sep = this.currentPath().includes('\\') ? '\\' : '/';
      const newFolderPath = `${this.currentPath()}${sep}${trimmed}`;
      const res = await this.electron.createDeviceFolder(newFolderPath);
      this.isLoading.set(false);
      if (res.ok) {
        await this.refreshCurrentDirectory();
        return { ok: true, message: `تم إنشاء المجلد "${trimmed}" بنجاح` };
      }
      return { ok: false, message: res.error || 'تعذر إنشاء المجلد' };
    }

    if (this.currentWebHandle) {
      try {
        await this.currentWebHandle.getDirectoryHandle(trimmed, { create: true });
        this.isLoading.set(false);
        await this.refreshCurrentDirectory();
        return { ok: true, message: `تم إنشاء المجلد "${trimmed}" بنجاح` };
      } catch (err: any) {
        this.isLoading.set(false);
        return { ok: false, message: 'خطأ في إنشاء المجلد: ' + (err.message || '') };
      }
    }

    this.isLoading.set(false);
    return { ok: false, message: 'لا يوجد مجلد نشط' };
  }

  /**
   * Open item with system default app (Electron) or prepare for in-app preview
   */
  async openItemNative(item: UnifiedFsItem): Promise<{ ok: boolean; error?: string }> {
    if (this.isElectron && item.path) {
      return this.electron.openDevicePath(item.path);
    }
    return { ok: false, error: 'غير متوفر في وضع المتصفح' };
  }

  /**
   * Show in Windows Explorer / Finder (Electron only)
   */
  async showInExplorer(item: UnifiedFsItem): Promise<void> {
    if (this.isElectron && item.path) {
      await this.electron.showInFolder(item.path);
    }
  }

  /**
   * Get File object or URL for in-app preview
   */
  async getFileForPreview(item: UnifiedFsItem): Promise<{ blobUrl?: string; textContent?: string; type: string } | null> {
    if (item.isDirectory) return null;

    try {
      if (this.currentWebHandle && item.handle) {
        const file: File = await item.handle.getFile();
        const cat = this.categorizeExtension(item.extension);
        if (cat === 'document' && ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'csv', 'xml', 'log'].includes(item.extension)) {
          const text = await file.text();
          return { textContent: text, type: 'text' };
        }
        const blobUrl = URL.createObjectURL(file);
        return { blobUrl, type: cat };
      }

      if (this.isElectron && item.path) {
        const cat = this.categorizeExtension(item.extension);
        if (cat === 'document' && ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'csv', 'xml', 'log'].includes(item.extension)) {
          const content = await this.electron.readFile(item.path);
          return { textContent: content || '', type: 'text' };
        }
        const cleanPath = item.path.replace(/\\/g, '/');
        const fileUrl = `file:///${encodeURI(cleanPath)}`;
        return { blobUrl: fileUrl, type: cat };
      }
    } catch (e) {
      console.error('Preview load error:', e);
    }
    return null;
  }

  // ── Private Loader Helpers ──

  private async loadElectronDirectory(dirPath: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const res = await this.electron.listDirectory(dirPath);
      if (res.ok && res.items) {
        const unified: UnifiedFsItem[] = res.items.map(item => ({
          id: item.path,
          name: item.name,
          path: item.path,
          isDirectory: item.isDirectory,
          size: item.size,
          modifiedAt: item.modifiedAt,
          extension: item.extension,
          inaccessible: item.inaccessible
        }));
        this.items.set(unified);
      } else {
        this.errorMessage.set(res.error || 'فشل في قراءة محتويات المجلد');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'خطأ أثناء تحميل المجلد');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadWebDirectory(dirHandle: any): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const unified: UnifiedFsItem[] = [];
      for await (const [name, handle] of dirHandle.entries()) {
        const isDir = handle.kind === 'directory';
        let size = 0;
        let modifiedAt = Date.now();
        let ext = '';

        if (!isDir) {
          try {
            const f = await handle.getFile();
            size = f.size;
            modifiedAt = f.lastModified;
            const parts = name.split('.');
            ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';
          } catch {
            // Unreadable single file
          }
        }

        unified.push({
          id: `${dirHandle.name}/${name}`,
          name,
          isDirectory: isDir,
          size,
          modifiedAt,
          extension: ext,
          handle
        });
      }
      this.items.set(unified);
    } catch (err: any) {
      this.errorMessage.set('فشل في قراءة محتويات المجلد: ' + (err.message || ''));
    } finally {
      this.isLoading.set(false);
    }
  }

  // Helper: Format bytes to human readable
  formatBytes(bytes: number, decimals = 1): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Helper: Categorize extension
  categorizeExtension(ext: string): FileCategory {
    const clean = ext.toLowerCase();
    const videoExts = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'flv', 'm4v', 'ts'];
    const audioExts = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'json', 'js', 'ts', 'html', 'css', 'py'];
    const archExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'];

    if (videoExts.includes(clean)) return 'video';
    if (audioExts.includes(clean)) return 'audio';
    if (imageExts.includes(clean)) return 'image';
    if (docExts.includes(clean)) return 'document';
    if (archExts.includes(clean)) return 'archive';
    return 'document';
  }
}
