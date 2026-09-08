import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DeviceFilesService, UnifiedFsItem, FileCategory, SortField, SortDirection } from '../../core/services/device-files.service';
import { 
  LucideAngularModule, HardDrive, FolderOpen, Folder, FolderPlus, 
  Trash2, TriangleAlert, RefreshCw, Search, ArrowUpDown, LayoutGrid, List, 
  FileText, Film, Music, Image as ImageIcon, Archive, File, 
  ExternalLink, Pencil, Copy, Eye, X, Check, Laptop, ShieldAlert,
  ChevronRight, ArrowLeft, ArrowUp, Info, Sparkles, Monitor,
  ShieldCheck, Lock, LockOpen
} from 'lucide-angular';
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-device-files',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './device-files.component.html',
  styleUrls: ['./device-files.component.scss']
})
export class DeviceFilesComponent {
  fs = inject(DeviceFilesService);
  private sanitizer = inject(DomSanitizer);

  // Icons
  HardDrive = HardDrive;
  FolderOpen = FolderOpen;
  Folder = Folder;
  FolderPlus = FolderPlus;
  Trash2 = Trash2;
  AlertTriangle = TriangleAlert;
  TriangleAlert = TriangleAlert;
  RefreshCw = RefreshCw;
  Search = Search;
  ArrowUpDown = ArrowUpDown;
  Grid = LayoutGrid;
  LayoutGrid = LayoutGrid;
  List = List;
  FileText = FileText;
  Film = Film;
  Music = Music;
  ImageIcon = ImageIcon;
  Archive = Archive;
  File = File;
  ExternalLink = ExternalLink;
  Edit2 = Pencil;
  Pencil = Pencil;
  Copy = Copy;
  Eye = Eye;
  X = X;
  Check = Check;
  Laptop = Laptop;
  ShieldAlert = ShieldAlert;
  ChevronRight = ChevronRight;
  ArrowLeft = ArrowLeft;
  ArrowUp = ArrowUp;
  Info = Info;
  Sparkles = Sparkles;
  Monitor = Monitor;
  ShieldCheck = ShieldCheck;
  Lock = Lock;
  LockOpen = LockOpen;

  // View settings
  viewMode = signal<'grid' | 'list'>('grid');

  // Categories list
  categories: { id: FileCategory; label: string; icon: any }[] = [
    { id: 'all', label: 'الكل', icon: HardDrive },
    { id: 'folder', label: 'المجلدات', icon: Folder },
    { id: 'video', label: 'فيديو', icon: Film },
    { id: 'audio', label: 'صوتيات', icon: Music },
    { id: 'image', label: 'صور', icon: ImageIcon },
    { id: 'document', label: 'مستندات ونصوص', icon: FileText },
    { id: 'archive', label: 'أرشيف ومضغوط', icon: Archive }
  ];

  // Toast notification state
  toast = signal<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Modals state
  showRenameModal = signal<boolean>(false);
  targetRenameItem = signal<UnifiedFsItem | null>(null);
  renameInput = signal<string>('');

  showNewFolderModal = signal<boolean>(false);
  newFolderNameInput = signal<string>('');

  showDeleteConfirmModal = signal<boolean>(false);
  targetDeleteItem = signal<UnifiedFsItem | null>(null);
  deleteMode = signal<'trash' | 'permanent'>('trash');

  showPreviewModal = signal<boolean>(false);
  previewItem = signal<UnifiedFsItem | null>(null);
  previewData = signal<{ blobUrl?: SafeResourceUrl | SafeUrl | string; textContent?: string; type: string } | null>(null);
  previewLoading = signal<boolean>(false);

  // Category selection handler
  setCategory(cat: FileCategory): void {
    this.fs.selectedCategory.set(cat);
  }

  // Sort handler
  setSort(field: SortField): void {
    if (this.fs.sortBy() === field) {
      this.fs.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.fs.sortBy.set(field);
      this.fs.sortDirection.set('asc');
    }
  }

  // ── File & Folder Interaction ──

  async handleItemClick(item: UnifiedFsItem): Promise<void> {
    if (item.isDirectory) {
      await this.fs.navigateIntoFolder(item);
    } else {
      await this.openPreview(item);
    }
  }

  async openNative(item: UnifiedFsItem, e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    if (!this.fs.isElectron) {
      this.showToast('فتح الملف بالبرنامج الافتراضي متاح في نسخة الحاسوب فقط', 'warning');
      return;
    }
    const res = await this.fs.openItemNative(item);
    if (!res.ok) {
      this.showToast(res.error || 'تعذر فتح الملف', 'error');
    }
  }

  async showInExplorer(item: UnifiedFsItem, e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    if (!this.fs.isElectron) return;
    await this.fs.showInExplorer(item);
  }

  // ── Rename ──
  openRenameModal(item: UnifiedFsItem, e?: Event): void {
    if (e) e.stopPropagation();
    this.targetRenameItem.set(item);
    this.renameInput.set(item.name);
    this.showRenameModal.set(true);
  }

  async submitRename(): Promise<void> {
    const item = this.targetRenameItem();
    const newName = this.renameInput();
    if (!item || !newName.trim()) return;

    const res = await this.fs.renameItem(item, newName);
    this.showRenameModal.set(false);
    if (res.ok) {
      this.showToast(res.message, 'success');
    } else {
      this.showToast(res.message, 'error');
    }
  }

  // ── New Folder ──
  openNewFolderModal(): void {
    this.newFolderNameInput.set('مجلد جديد');
    this.showNewFolderModal.set(true);
  }

  async submitNewFolder(): Promise<void> {
    const name = this.newFolderNameInput();
    if (!name.trim()) return;

    const res = await this.fs.createFolder(name);
    this.showNewFolderModal.set(false);
    if (res.ok) {
      this.showToast(res.message, 'success');
    } else {
      this.showToast(res.message, 'error');
    }
  }

  // ── Delete / Trash ──
  openDeleteConfirm(item: UnifiedFsItem, mode: 'trash' | 'permanent', e?: Event): void {
    if (e) e.stopPropagation();

    // If web user clicks trash, warn them immediately or switch to permanent prompt
    if (mode === 'trash' && !this.fs.isElectron) {
      this.deleteMode.set('trash');
      this.targetDeleteItem.set(item);
      this.showDeleteConfirmModal.set(true);
      return;
    }

    this.targetDeleteItem.set(item);
    this.deleteMode.set(mode);
    this.showDeleteConfirmModal.set(true);
  }

  async submitDelete(): Promise<void> {
    const item = this.targetDeleteItem();
    const mode = this.deleteMode();
    if (!item) return;

    this.showDeleteConfirmModal.set(false);

    if (mode === 'trash') {
      const res = await this.fs.moveToRecycleBin(item);
      if (res.ok) {
        this.showToast(res.message, 'success');
      } else {
        this.showToast(res.message, res.isWebLimitation ? 'warning' : 'error');
      }
    } else {
      const res = await this.fs.permanentDelete(item);
      if (res.ok) {
        this.showToast(res.message, 'success');
      } else {
        this.showToast(res.message, 'error');
      }
    }
  }

  // ── Preview Modal ──
  async openPreview(item: UnifiedFsItem, e?: Event): Promise<void> {
    if (e) e.stopPropagation();
    this.previewItem.set(item);
    this.previewData.set(null);
    this.previewLoading.set(true);
    this.showPreviewModal.set(true);

    const res = await this.fs.getFileForPreview(item);
    this.previewLoading.set(false);

    if (res) {
      let safeBlobUrl: SafeResourceUrl | string | undefined = res.blobUrl;
      if (res.blobUrl && typeof res.blobUrl === 'string') {
        safeBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.blobUrl);
      }
      this.previewData.set({
        type: res.type,
        textContent: res.textContent,
        blobUrl: safeBlobUrl
      });
    }
  }

  closePreview(): void {
    this.showPreviewModal.set(false);
    this.previewItem.set(null);
    this.previewData.set(null);
  }

  // ── Helper: File Icon ──
  getItemIcon(item: UnifiedFsItem | null | undefined): any {
    if (!item) return File;
    if (item.isDirectory) return Folder;
    const cat = this.fs.categorizeExtension(item.extension || '');
    switch (cat) {
      case 'video': return Film;
      case 'audio': return Music;
      case 'image': return ImageIcon;
      case 'document': return FileText;
      case 'archive': return Archive;
      default: return File;
    }
  }

  getItemIconColor(item: UnifiedFsItem | null | undefined): string {
    if (!item) return 'text-slate-400';
    if (item.isDirectory) return 'text-amber-400 fill-amber-400/20';
    const cat = this.fs.categorizeExtension(item.extension || '');
    switch (cat) {
      case 'video': return 'text-purple-400';
      case 'audio': return 'text-emerald-400';
      case 'image': return 'text-cyan-400';
      case 'document': return 'text-blue-400';
      case 'archive': return 'text-orange-400';
      default: return 'text-slate-400';
    }
  }

  formatDate(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async toggleSafetyLock(): Promise<void> {
    const res = await this.fs.togglePermissionMode();
    this.showToast(res.message, res.granted ? 'success' : 'info');
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.toast.set({ message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 4000);
  }
}
