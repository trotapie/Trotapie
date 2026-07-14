import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CustomSwitchComponent } from 'app/shared/custom-switch/custom-switch.component';
import { MaterialModule } from 'app/shared/material.module';
import { backdropFade, modalScaleFade } from 'app/shared/animations';

export interface FolderImageManagerImage {
  id: string | number;
  draftKey?: string | null;
  name: string;
  imageUrl: string;
  folderId?: string | number | null;
  folderName?: string | null;
  subtitle?: string | null;
  typeLabel?: string | null;
  extension?: string | null;
  mimeType?: string | null;
  sizeLabel?: string | null;
  oscurecerFondo?: boolean;
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
    imports: [CommonModule, MaterialModule, CustomSwitchComponent],
  templateUrl: './folder-image-manager.component.html',
  styleUrl: './folder-image-manager.component.scss',
  animations: [modalScaleFade, backdropFade],
})
export class FolderImageManagerComponent implements OnChanges, OnDestroy {
  @Input() title = 'Administrador de archivos';
  @Input() subtitle = 'Selecciona una carpeta y elige una imagen.';
  @Input() folders: FolderImageManagerFolder[] = [];
  @Input() selectedImageId: string | number | null = null;
  @Input() activeImageIds: Array<string | number> | Set<string | number> = [];
  @Input() showDetailPanel = true;
  @Input() isSaving = false;
  @Input() isSavingFolder = false;
  @Input() showDeleteAllImages = false;
  @Input() isDeletingAllImages = false;

  @Output() imageSelected = new EventEmitter<FolderImageManagerImage>();
  @Output() folderSelected = new EventEmitter<FolderImageManagerFolder | null>();
  @Output() createFolder = new EventEmitter<string>();
  @Output() renameFolder = new EventEmitter<{ folder: FolderImageManagerFolder; name: string }>();
  @Output() deleteFolder = new EventEmitter<FolderImageManagerFolder>();
  @Output() addImage = new EventEmitter<void>();
  @Output() deleteAllImages = new EventEmitter<void>();
  @Output() imageDroppedOnFolder = new EventEmitter<{ image: FolderImageManagerImage; folder: FolderImageManagerFolder }>();
  @Output() editImage = new EventEmitter<FolderImageManagerImage>();
  @Output() toggleImageActive = new EventEmitter<{ image: FolderImageManagerImage; checked: boolean }>();
  @Output() deleteImage = new EventEmitter<FolderImageManagerImage>();
  @Output() toggleImageDarken = new EventEmitter<{ image: FolderImageManagerImage; checked: boolean }>();
  @Output() toggleFolderActive = new EventEmitter<FolderImageManagerFolder>();
  @Output() toggleSelectedImagesActive = new EventEmitter<FolderImageManagerImage[]>();

  activeFolderId: string | number | null = null;
  searchTerm = '';
  activeView: 'all' | 'folders' | 'images' | 'favorites' = 'all';
  selectedImageIds = new Set<string>();
  selectionModeActive = false;
  creatingFolder = false;
  newFolderName = '';
  editingFolderId: string | number | null = null;
  editingFolderName = '';
  activeFolderActionsId: string | number | null = null;
  folderActionsTargetFolder: FolderImageManagerFolder | null = null;
  draggedImage: FolderImageManagerImage | null = null;
  dropTargetFolderId: string | number | null = null;
  private previousActiveImageIdSet = new Set<string>();

  get activeImageIdSet(): Set<string> {
    const values = this.activeImageIds instanceof Set ? Array.from(this.activeImageIds) : this.activeImageIds ?? [];
    return new Set(values.map((value) => String(value)));
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.activeFolderActionsId = null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const selectedImageChanged =
      !!changes['selectedImageId'] && changes['selectedImageId'].previousValue !== changes['selectedImageId'].currentValue;
    const foldersChanged = !!changes['folders'];
    const activeImageIdsChanged = !!changes['activeImageIds'];

    if (this.creatingFolder && changes['folders']) {
      const prevLength = changes['folders'].previousValue?.length ?? 0;
      const currLength = changes['folders'].currentValue?.length ?? 0;
      if (currLength > prevLength) {
        this.cancelCreateFolder();
      }
    }

    if (!this.folders.length) {
      this.activeFolderId = null;
      this.folderSelected.emit(null);
      this.syncSelectionWithActiveImages();
      return;
    }

    if (activeImageIdsChanged) {
      this.syncSelectionWithActiveImages();
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

  get filteredFolders(): FolderImageManagerFolder[] {
    const term = this.normalizedSearchTerm;
    let folders = this.folders;

    if (this.activeView === 'favorites') {
      folders = folders.filter((folder) => folder.images.some((image) => this.isActiveImage(image)));
    }

    if (!term) {
      return folders;
    }

    return folders.filter((folder) => {
      const inFolder = folder.name.toLowerCase().includes(term) || (folder.description ?? '').toLowerCase().includes(term);
      const inImages = folder.images.some((image) => this.matchesImageSearch(image, term));
      return inFolder || inImages;
    });
  }

  get activeFolder(): FolderImageManagerFolder | null {
    return this.filteredFolders.find((folder) => folder.id === this.activeFolderId)
      ?? this.folders.find((folder) => folder.id === this.activeFolderId)
      ?? null;
  }

  get activeImages(): FolderImageManagerImage[] {
    const images = this.activeFolder?.images ?? [];
    const term = this.normalizedSearchTerm;

    return images.filter((image) => {
      if (this.activeView === 'favorites' && !this.isActiveImage(image)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return this.matchesImageSearch(image, term);
    });
  }

  get selectedImages(): FolderImageManagerImage[] {
    const ids = this.selectedImageIds;
    if (!ids.size) {
      return [];
    }

    return this.folders.flatMap((folder) => folder.images).filter((image) => ids.has(String(image.id)));
  }

  get selectedImage(): FolderImageManagerImage | null {
    if (this.selectedImageId === null || this.selectedImageId === undefined) {
      return null;
    }

    return this.findImageById(this.selectedImageId);
  }

  get activeImage(): FolderImageManagerImage | null {
    return this.folders.flatMap((folder) => folder.images).find((image) => this.isActiveImage(image)) ?? null;
  }

  get detailImage(): FolderImageManagerImage | null {
    return this.selectedImage ?? this.activeImage ?? this.activeImages[0] ?? null;
  }

  get detailImageActiveChecked(): boolean {
    const image = this.detailImage;
    return image ? this.isActiveImage(image) : false;
  }

  get detailImageDarkenChecked(): boolean {
    const image = this.detailImage;
    return !!image?.oscurecerFondo;
  }

  get detailFolderName(): string {
    return this.detailImage?.folderName ?? this.activeFolder?.name ?? 'Sin carpeta';
  }

  get detailStatusLabel(): string {
    if (!this.detailImage) {
      return 'Sin seleccion';
    }

    if (this.isActiveImage(this.detailImage)) {
      return 'Activa';
    }

    if (this.isSelected(this.detailImage)) {
      return 'Seleccionada';
    }

    return 'Oculta';
  }

  get shouldShowFoldersSection(): boolean {
    return this.activeView === 'all' || this.activeView === 'folders';
  }

  get shouldShowImagesSection(): boolean {
    return this.activeView === 'all' || this.activeView === 'images' || this.activeView === 'favorites';
  }

  get emptyStateMessage(): string {
    if (this.activeView === 'favorites') {
      return 'No hay imagenes activas que coincidan con esta busqueda.';
    }

    if (this.normalizedSearchTerm) {
      return 'No encontramos resultados para esta busqueda.';
    }

    return 'No hay archivos dentro de esta carpeta.';
  }

  isSelected(image: FolderImageManagerImage): boolean {
    return this.idsMatch(image.id, this.selectedImageId);
  }

  isActiveImage(image: FolderImageManagerImage): boolean {
    return this.activeImageIdSet.has(String(image.id));
  }

  isBulkSelected(image: FolderImageManagerImage): boolean {
    return this.selectedImageIds.has(String(image.id));
  }

  get selectedImageCount(): number {
    return this.selectedImageIds.size;
  }

  get areAllSelectedImagesActive(): boolean {
    return this.selectedImages.length > 0 && this.selectedImages.every((image) => this.isActiveImage(image));
  }

  get selectedImagesActionLabel(): string {
    return this.areAllSelectedImagesActive ? 'Inactivar seleccionados' : 'Activar seleccionadas';
  }

  isFolderFullyActive(folder: FolderImageManagerFolder): boolean {
    return folder.images.length > 0 && folder.images.every((image) => this.isActiveImage(image));
  }

  private syncSelectionWithActiveImages(): void {
    const currentActiveIds = this.activeImageIdSet;
    const removedActiveIds = Array.from(this.previousActiveImageIdSet).filter((id) => !currentActiveIds.has(id));

    if (removedActiveIds.length) {
      removedActiveIds.forEach((id) => this.selectedImageIds.delete(id));
    }

    this.previousActiveImageIdSet = new Set(currentActiveIds);
  }

  private findImageById(imageId: string | number): FolderImageManagerImage | null {
    for (const folder of this.folders) {
      const image = folder.images.find((item) => this.idsMatch(item.id, imageId));
      if (image) {
        return image;
      }
    }

    return null;
  }

  private idsMatch(left: string | number | null | undefined, right: string | number | null | undefined): boolean {
    if (left === null || left === undefined || right === null || right === undefined) {
      return false;
    }

    return String(left) === String(right);
  }

  selectFolder(folder: FolderImageManagerFolder): void {
    this.activeFolderId = folder.id;
    this.folderSelected.emit(folder);
  }

  setSearchTerm(value: string): void {
    this.searchTerm = value;
    this.ensureActiveFolderVisible();
  }

  setActiveView(view: 'all' | 'folders' | 'images' | 'favorites'): void {
    this.activeView = view;
    this.ensureActiveFolderVisible();
  }

  requestDeleteFolder(folder: FolderImageManagerFolder, event?: Event): void {
    event?.stopPropagation();
    this.activeFolderActionsId = null;
    this.deleteFolder.emit(folder);
  }

  startRenameFolder(folder: FolderImageManagerFolder, event?: Event): void {
    event?.stopPropagation();
    this.activeFolderActionsId = null;
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
    if (this.selectionModeActive) {
      this.toggleBulkSelection(image);
      return;
    }

    this.imageSelected.emit(image);
  }

  toggleSelectionMode(): void {
    this.selectionModeActive = !this.selectionModeActive;

    if (!this.selectionModeActive) {
      this.clearBulkSelection();
    }
  }

  toggleBulkSelection(image: FolderImageManagerImage, event?: Event): void {
    event?.stopPropagation();
    const key = String(image.id);
    if (this.selectedImageIds.has(key)) {
      this.selectedImageIds.delete(key);
      return;
    }

    this.selectedImageIds.add(key);
  }

  clearBulkSelection(event?: Event): void {
    event?.stopPropagation();
    this.selectedImageIds.clear();
  }

  requestEditImage(image: FolderImageManagerImage | null): void {
    if (!image) {
      return;
    }

    this.editImage.emit(image);
  }

  requestToggleImageActive(image: FolderImageManagerImage | null): void {
    if (!image) {
      return;
    }

    this.toggleImageActive.emit({ image, checked: !this.isActiveImage(image) });
  }

  requestSetImageActive(image: FolderImageManagerImage | null, checked: boolean): void {
    if (!image) {
      return;
    }

    this.toggleImageActive.emit({ image, checked });
  }

  requestToggleImageDarken(image: FolderImageManagerImage | null, checked: boolean): void {
    if (!image) {
      return;
    }

    this.toggleImageDarken.emit({ image, checked });
  }

  requestDeleteImage(image: FolderImageManagerImage | null): void {
    if (!image) {
      return;
    }

    this.deleteImage.emit(image);
  }

  requestToggleFolderActive(folder: FolderImageManagerFolder): void {
    this.toggleFolderActive.emit(folder);
  }

  requestToggleSelectedImagesActive(): void {
    const selected = this.selectedImages;
    if (!selected.length) {
      return;
    }

    this.toggleSelectedImagesActive.emit(selected);
    this.selectedImageIds.clear();
    this.selectionModeActive = false;
  }

  toggleFolderActions(folder: FolderImageManagerFolder, event: Event): void {
    event.stopPropagation();
    this.activeFolderActionsId = this.activeFolderActionsId === folder.id ? null : folder.id;
  }

  isFolderActionsOpen(folder: FolderImageManagerFolder): boolean {
    return this.activeFolderActionsId === folder.id;
  }

  onImageDragStart(image: FolderImageManagerImage, event: DragEvent): void {
    this.draggedImage = image;
    this.dropTargetFolderId = null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(image.id));
    }
  }

  onImageDragEnd(): void {
    this.draggedImage = null;
    this.dropTargetFolderId = null;
  }

  onFolderDragOver(folder: FolderImageManagerFolder, event: DragEvent): void {
    if (!this.draggedImage || folder.id === this.draggedImage.folderId) {
      return;
    }

    event.preventDefault();
    this.dropTargetFolderId = folder.id;
  }

  onFolderDragLeave(folder: FolderImageManagerFolder): void {
    if (this.dropTargetFolderId === folder.id) {
      this.dropTargetFolderId = null;
    }
  }

  onFolderDrop(folder: FolderImageManagerFolder, event: DragEvent): void {
    event.preventDefault();
    const image = this.draggedImage;
    this.draggedImage = null;
    this.dropTargetFolderId = null;

    if (!image || folder.id === image.folderId) {
      return;
    }

    const sourceFolder = this.folders.find((item) => item.id === image.folderId) ?? null;
    this.imageDroppedOnFolder.emit({ image, folder });

    if (sourceFolder) {
      this.activeFolderId = sourceFolder.id;
    }
  }

  openCreateFolder(): void {
    this.creatingFolder = true;
    this.setModalLocked(true);
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
    this.setModalLocked(false);
  }

  confirmCreateFolder(): void {
    const nombre = this.newFolderName.trim();
    if (!nombre) {
      return;
    }

    this.createFolder.emit(nombre);
  }

  trackByFolder(_: number, folder: FolderImageManagerFolder): string | number {
    return folder.id;
  }

  trackByImage(_: number, image: FolderImageManagerImage): string | number {
    return image.id;
  }

  isDropTarget(folder: FolderImageManagerFolder): boolean {
    return this.dropTargetFolderId === folder.id;
  }

  getFileCountLabel(total: number): string {
    return `${total} ${total === 1 ? 'archivo' : 'archivos'}`;
  }

  getImageTypeLabel(image: FolderImageManagerImage): string {
    const mimeType = (image.mimeType ?? '').trim();
    if (mimeType) {
      return mimeType;
    }

    const explicitType = (image.typeLabel ?? '').trim();
    if (explicitType) {
      return explicitType.toUpperCase();
    }

    const extension = (image.extension ?? '').trim();
    if (extension) {
      return extension.toUpperCase();
    }

    const byName = image.name.split('.').pop()?.trim();
    if (byName) {
      return byName.toUpperCase();
    }

    const byUrl = image.imageUrl.split('.').pop()?.split('?')[0]?.trim();
    return (byUrl || 'IMG').toUpperCase();
  }

  getFolderPreviewImages(folder: FolderImageManagerFolder): FolderImageManagerImage[] {
    return folder.images.slice(0, 4);
  }

  isFolderPreviewAccent(index: number): boolean {
    return index === 1;
  }

  private activateInitialFolder(): void {
    const selectedFolder = this.findFolderBySelectedImage();
    const sourceFolders = this.filteredFolders.length ? this.filteredFolders : this.folders;
    const nextFolder =
      selectedFolder && sourceFolders.some((folder) => folder.id === selectedFolder.id)
        ? selectedFolder
        : sourceFolders.find((folder) => folder.images.length > 0) ?? sourceFolders[0];

    if (nextFolder && nextFolder.id !== this.activeFolderId) {
      this.activeFolderId = nextFolder.id;
      this.folderSelected.emit(nextFolder);
    }
  }

  private activateFolderForSelectedImage(): void {
    const selectedFolder = this.findFolderBySelectedImage();
    if (selectedFolder && this.filteredFolders.some((folder) => folder.id === selectedFolder.id) && selectedFolder.id !== this.activeFolderId) {
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
        folder.images.some((image) => this.idsMatch(image.id, this.selectedImageId))
      ) ?? null
    );
  }

  private ensureActiveFolderVisible(): void {
    const activeFolderStillVisible = this.filteredFolders.some((folder) => folder.id === this.activeFolderId);
    if (activeFolderStillVisible) {
      return;
    }

    const nextFolder = this.filteredFolders.find((folder) => folder.images.length > 0) ?? this.filteredFolders[0] ?? null;
    this.activeFolderId = nextFolder?.id ?? null;
    this.folderSelected.emit(nextFolder);
  }

  private get normalizedSearchTerm(): string {
    return this.searchTerm.trim().toLowerCase();
  }

  private matchesImageSearch(image: FolderImageManagerImage, term: string): boolean {
    return [
      image.name,
      image.folderName ?? '',
      image.subtitle ?? '',
      image.typeLabel ?? ''
    ].some((value) => value.toLowerCase().includes(term));
  }

  private setModalLocked(bloquear: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('modal-locked', bloquear);
  }
}
