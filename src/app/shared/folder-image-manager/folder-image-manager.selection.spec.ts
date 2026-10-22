import { FolderImageManagerComponent } from './folder-image-manager.component';

describe('FolderImageManager sin carpetas', () => {
  let manager: FolderImageManagerComponent;
  beforeEach(() => {
    manager = new FolderImageManagerComponent();
    manager.showFolders = false;
    manager.showFolderManagement = false;
    manager.folders = [{ id: 'inicio', name: 'Carrusel', images: [
      { id: 1, name: 'Roma', imageUrl: 'https://example.com/roma.jpg' },
      { id: 2, name: 'Lima', imageUrl: 'https://example.com/lima.jpg' }
    ] }];
    manager.activeFolderId = 'inicio';
    manager.activeImageIds = [1];
  });

  it('oculta la sección de carpetas y mantiene las imágenes', () => {
    expect(manager.shouldShowFoldersSection).toBeFalse();
    expect(manager.shouldShowImagesSection).toBeTrue();
    expect(manager.activeImages.length).toBe(2);
  });

  it('filtra imágenes activas y permite buscarlas por nombre', () => {
    manager.setActiveView('favorites');
    expect(manager.activeImages.map(image => image.id)).toEqual([1]);
    manager.setActiveView('images');
    manager.setSearchTerm('lima');
    expect(manager.activeImages.map(image => image.id)).toEqual([2]);
  });

  it('selecciona solo los resultados visibles y permite quitarlos', () => {
    manager.setSearchTerm('lima');
    manager.toggleAllVisibleImages();
    expect(manager.selectedImages.map(image => image.id)).toEqual([2]);
    expect(manager.allVisibleImagesSelected).toBeTrue();
    manager.toggleAllVisibleImages();
    expect(manager.selectedImageCount).toBe(0);
  });

  it('no permite cambiar la selección durante el guardado', () => {
    manager.isSaving = true;
    manager.toggleAllVisibleImages();
    expect(manager.selectedImageCount).toBe(0);
  });

  it('orienta a agregar imágenes sin mencionar carpetas', () => {
    expect(manager.emptyStateMessage).not.toContain('carpeta');
    expect(manager.emptyStateMessage).toContain('Agrega');
  });
});
