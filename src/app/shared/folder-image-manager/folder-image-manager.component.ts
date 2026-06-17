import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { MaterialModule } from 'app/shared/material.module';

export interface FolderImageManagerImage {
  id: string | number;
  name: string;
  imageUrl: string;
  folderId?: string | number | null;
  folderName?: string | null;
  subtitle?: string | null;
  typeLabel?: string | null;
}

export interface FolderImageManagerFolder {
  id: string | number;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  images: FolderImageManagerImage[];
}

@Component({
  selector: 'app-folder-image-manager',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './folder-image-manager.component.html',
  styleUrl: './folder-image-manager.component.scss'
})
export class FolderImageManagerComponent implements OnChanges, OnDestroy {
  @Input() title = 'Administrador de archivos';
  @Input() subtitle = 'Selecciona una carpeta y elige una imagen.';
  @Input() folders: FolderImageManagerFolder[] = [];
  @Input() selectedImageId: string | number | null = null;

  @Output() imageSelected = new EventEmitter<FolderImageManagerImage>();
  @Output() folderSelected = new EventEmitter<FolderImageManagerFolder | null>();
  @Output() createFolder = new EventEmitter<string>();
  @Output() renameFolder = new EventEmitter<{ folder: FolderImageManagerFolder; name: string }>();
  @Output() deleteFolder = new EventEmitter<FolderImageManagerFolder>();
  @Output() addImage = new EventEmitter<void>();

  activeFolderId: string | number | null = null;
  creatingFolder = false;
  newFolderName = '';
  editingFolderId: string | number | null = null;
  editingFolderName = '';
  folderActionsTargetFolder: FolderImageManagerFolder | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    const selectedImageChanged =
      !!changes['selectedImageId'] && changes['selectedImageId'].previousValue !== changes['selectedImageId'].currentValue;
    const foldersChanged = !!changes['folders'];

    if (!this.folders.length) {
      this.activeFolderId = null;
      this.folderSelected.emit(null);
      return;
    }

    if (selectedImageChanged) {
      this.activateFolderForSelectedImage();
      return;
    }

    const activeFolderStillExists = this.folders.some((folder) => folder.id === this.activeFolderId);
    if (!this.activeFolderId || !activeFolderStillExists) {
      this.activateInitialFolder();
      return;
    }

    if (foldersChanged && activeFolderStillExists) {
      return;
    }
  }

  ngOnDestroy(): void {
    this.setModalLocked(false);
  }

  get totalImages(): number {
    return this.folders.reduce((total, folder) => total + folder.images.length, 0);
  }

  get activeFolder(): FolderImageManagerFolder | null {
    return this.folders.find((folder) => folder.id === this.activeFolderId) ?? null;
  }

  get activeImages(): FolderImageManagerImage[] {
    return this.activeFolder?.images ?? [];
  }

  isSelected(image: FolderImageManagerImage): boolean {
    return image.id === this.selectedImageId;
  }

  selectFolder(folder: FolderImageManagerFolder): void {
    this.activeFolderId = folder.id;
    this.folderSelected.emit(folder);
  }

  requestDeleteFolder(folder: FolderImageManagerFolder, event?: Event): void {
    this.deleteFolder.emit(folder);
  }

  startRenameFolder(folder: FolderImageManagerFolder): void {
    this.folderActionsTargetFolder = folder;
    this.editingFolderId = null;
    this.editingFolderName = folder.name;
    this.setModalLocked(true);

    setTimeout(() => {
      this.editingFolderId = folder.id;
      queueMicrotask(() => {
        const input = document.getElementById('folder-rename-input') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      });
    }, 0);
  }

  cancelRenameFolder(event?: Event): void {
    event?.stopPropagation();
    this.editingFolderId = null;
    this.editingFolderName = '';
    this.folderActionsTargetFolder = null;
    this.setModalLocked(false);
  }

  confirmRenameFolder(folder: FolderImageManagerFolder): void {
    const nombre = this.editingFolderName.trim();
    if (!nombre || nombre === folder.name) {
      this.cancelRenameFolder();
      return;
    }

    this.renameFolder.emit({ folder, name: nombre });
    this.cancelRenameFolder();
  }

  selectImage(image: FolderImageManagerImage): void {
    this.imageSelected.emit(image);
  }

  openCreateFolder(): void {
    this.creatingFolder = true;
    queueMicrotask(() => {
      const input = document.getElementById('folder-create-input') as HTMLInputElement | null;
      input?.focus();
    });
  }

  emitAddImage(): void {
    this.addImage.emit();
  }

  cancelCreateFolder(): void {
    this.creatingFolder = false;
    this.newFolderName = '';
  }

  confirmCreateFolder(): void {
    const nombre = this.newFolderName.trim();
    if (!nombre) {
      return;
    }

    this.createFolder.emit(nombre);
    this.cancelCreateFolder();
  }

  trackByFolder(_: number, folder: FolderImageManagerFolder): string | number {
    return folder.id;
  }

  trackByImage(_: number, image: FolderImageManagerImage): string | number {
    return image.id;
  }

  getFileCountLabel(total: number): string {
    return `${total} ${total === 1 ? 'archivo' : 'archivos'}`;
  }

  getImageTypeLabel(image: FolderImageManagerImage): string {
    const explicitType = (image.typeLabel ?? '').trim();
    if (explicitType) {
      return explicitType.toUpperCase();
    }

    const byName = image.name.split('.').pop()?.trim();
    if (byName) {
      return byName.toUpperCase();
    }

    const byUrl = image.imageUrl.split('.').pop()?.split('?')[0]?.trim();
    return (byUrl || 'IMG').toUpperCase();
  }

  private activateInitialFolder(): void {
    const selectedFolder = this.findFolderBySelectedImage();
    const nextFolder =
      selectedFolder ??
      this.folders.find((folder) => folder.images.length > 0) ??
      this.folders[0];

    if (nextFolder && nextFolder.id !== this.activeFolderId) {
      this.activeFolderId = nextFolder.id;
      this.folderSelected.emit(nextFolder);
    }
  }

  private activateFolderForSelectedImage(): void {
    const selectedFolder = this.findFolderBySelectedImage();
    if (selectedFolder && selectedFolder.id !== this.activeFolderId) {
      this.activeFolderId = selectedFolder.id;
      this.folderSelected.emit(selectedFolder);
      return;
    }

    if (!this.activeFolderId || !this.folders.some((folder) => folder.id === this.activeFolderId)) {
      this.activateInitialFolder();
    }
  }

  private findFolderBySelectedImage(): FolderImageManagerFolder | null {
    if (this.selectedImageId === null || this.selectedImageId === undefined) {
      return null;
    }

    return (
      this.folders.find((folder) =>
        folder.images.some((image) => image.id === this.selectedImageId)
      ) ?? null
    );
  }

  private setModalLocked(bloquear: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('modal-locked', bloquear);
  }
}
