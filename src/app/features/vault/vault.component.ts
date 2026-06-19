import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { VaultService, DriveAsset } from '../../core/vault.service';

@Component({
  selector: 'app-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './vault.component.html',
  styleUrls: ['./vault.component.scss']
})
export class VaultComponent {
  vaultService = inject(VaultService);

  // Search filter query
  searchQuery = signal<string>('');

  // Layout view mode
  viewMode = signal<'grid' | 'list'>('grid');

  // Interactive Create Modals togglers
  isFolderModalOpen = false;
  newFolderName = '';

  isFileModalOpen = false;
  newFileName = '';
  newFileType: 'image' | 'video' | 'audio' | 'pdf' | 'file' = 'pdf';

  // Selected file preview modal
  selectedAsset = signal<DriveAsset | null>(null);

  // Filter assets based on search query
  get filteredAssets(): DriveAsset[] {
    const list = this.vaultService.currentAssets();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return list;
    return list.filter(a => a.name.toLowerCase().includes(query));
  }

  // Categories sidebar tabs controls
  setTab(tab: 'all' | 'recent' | 'favorites'): void {
    this.vaultService.activeTab.set(tab);
    // Reset to root when tab switches
    this.vaultService.currentFolderId.set('root');
    this.vaultService.folderStack.set([]);
  }

  // Level down folder
  enterFolder(folder: DriveAsset): void {
    if (folder.mimeType !== 'folder') return;

    this.vaultService.folderStack.update(stack => [
      ...stack,
      { id: this.vaultService.currentFolderId(), name: folder.name }
    ]);
    this.vaultService.currentFolderId.set(folder.id);
  }

  // Level up folder
  leaveFolder(): void {
    const stack = [...this.vaultService.folderStack()];
    const parent = stack.pop();
    if (parent) {
      this.vaultService.folderStack.set(stack);
      this.vaultService.currentFolderId.set(parent.id);
    } else {
      this.vaultService.currentFolderId.set('root');
      this.vaultService.folderStack.set([]);
    }
  }

  // Actions
  handleCreateFolder(): void {
    if (!this.newFolderName.trim()) return;
    this.vaultService.addFolder(this.newFolderName);
    this.newFolderName = '';
    this.isFolderModalOpen = false;
  }

  handleUploadFile(): void {
    if (!this.newFileName.trim()) return;

    // Pick simulated asset size based on type
    const sizes = { image: '1.4 MB', video: '45.2 MB', audio: '6.8 MB', pdf: '2.1 MB', file: '850 KB' };
    const urls = {
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
      video: '',
      audio: '',
      pdf: '',
      file: ''
    };

    this.vaultService.uploadFile(
      this.newFileName,
      this.newFileType,
      sizes[this.newFileType],
      urls[this.newFileType]
    );

    this.newFileName = '';
    this.isFileModalOpen = false;
  }

  handleDeleteAsset(id: string): void {
    if (confirm("هل أنت متأكد من حذف هذا العنصر نهائياً من الخزنة؟")) {
      this.vaultService.deleteAsset(id);
      if (this.selectedAsset()?.id === id) {
        this.selectedAsset.set(null);
      }
    }
  }

  toggleFavorite(id: string): void {
    this.vaultService.toggleFavorite(id);
    // Refresh active preview asset favorite status
    const current = this.selectedAsset();
    if (current && current.id === id) {
      this.selectedAsset.set({ ...current, isFavorite: !current.isFavorite });
    }
  }
}
