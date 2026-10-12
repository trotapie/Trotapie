import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { EditarActividadDestinoComponent } from './editar-actividad-destino.component';
import { FolderImageManagerImage } from 'app/shared/folder-image-manager/folder-image-manager.component';

describe('Activación individual de imágenes guardadas', () => {
  let editor: EditarActividadDestinoComponent;
  let imagenes: FormArray;
  let actualizarEstado: jasmine.Spy;
  let toast: jasmine.Spy;
  const image = { id: '42' } as FolderImageManagerImage;

  beforeEach(() => {
    editor = Object.create(EditarActividadDestinoComponent.prototype);
    imagenes = new FormArray([
      new FormGroup({ id: new FormControl(42), activa: new FormControl(false), imagen_url: new FormControl('imagen.jpg') }),
      new FormGroup({ id: new FormControl(43), activa: new FormControl(false), imagen_url: new FormControl('', Validators.required) })
    ]);
    actualizarEstado = jasmine.createSpy('actualizarEstado').and.resolveTo();
    toast = jasmine.createSpy('toast');
    Object.assign(editor, {
      destinoId: 21385, actividadId: 123, guardandoImagenes: false, abriendoPreview: false,
      actividadesService: { actualizarEstadoImagenActividadAdmin: actualizarEstado },
      toast: { show: toast }
    });
    Object.defineProperty(editor, 'imagenesArray', { get: () => imagenes });
  });

  it('activa solo la imagen seleccionada aunque otra imagen esté incompleta', async () => {
    const guardarGaleria = spyOn(editor, 'guardarImagenes');
    const preview = spyOn(editor, 'verPreview');
    expect(imagenes.invalid).toBeTrue();
    await editor.alternarImagenActivaDesdeGestor({ image, checked: true });
    expect(actualizarEstado).toHaveBeenCalledOnceWith({ destino_id: 21385, actividad_id: 123, imagen_id: 42, activa: true });
    expect(imagenes.at(0).get('activa')?.value).toBeTrue();
    expect(imagenes.at(1).get('activa')?.value).toBeFalse();
    expect(guardarGaleria).not.toHaveBeenCalled();
    expect(preview).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('restaura el switch y muestra el error si falla el guardado', async () => {
    actualizarEstado.and.rejectWith(new Error('Error de conexión'));
    await editor.alternarImagenActivaDesdeGestor({ image, checked: true });
    expect(imagenes.at(0).get('activa')?.value).toBeFalse();
    expect(editor.guardandoImagenes).toBeFalse();
    expect(toast).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Error de conexión', variant: 'error' }));
  });

  it('ignora una imagen inexistente sin guardar otra imagen', async () => {
    await editor.alternarImagenActivaDesdeGestor({ image: { id: '999' } as FolderImageManagerImage, checked: true });
    expect(actualizarEstado).not.toHaveBeenCalled();
    expect(imagenes.at(0).get('activa')?.value).toBeFalse();
  });
});
