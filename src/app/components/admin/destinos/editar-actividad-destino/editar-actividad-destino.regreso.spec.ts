import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { FolderImageManagerImage } from 'app/shared/folder-image-manager/folder-image-manager.component';
import { EditarActividadDestinoComponent } from './editar-actividad-destino.component';

describe('Regreso del preview al editor de actividad', () => {
  let editor: EditarActividadDestinoComponent;
  let nombre: FormControl;
  let imagen: FormGroup;

  beforeEach(() => {
    editor = Object.create(EditarActividadDestinoComponent.prototype);
    nombre = new FormControl('');
    imagen = new FormGroup({
      id: new FormControl(42), draft_key: new FormControl('imagen-42'),
      imagen_url: new FormControl('imagen.jpg', Validators.required),
      imagen_zoom: new FormControl(0.8), imagen_x: new FormControl(30),
      traducciones: new FormGroup({ es: new FormGroup({ nombre }) })
    });
    Object.assign(editor, {
      form: new FormGroup({ imagenes: new FormArray([imagen]) }),
      pendientesImagenesCarpeta: new Map(), imagenEditandoIndex: null,
      editorImagenAbierto: false
    });
  });

  afterEach(() => document.body.classList.remove('modal-locked'));

  it('elimina errores residuales de validadores retirados sin borrar los cambios', () => {
    nombre.addValidators(Validators.required);
    nombre.updateValueAndValidity();
    nombre.removeValidators(Validators.required);
    imagen.markAsDirty();
    expect(editor.form.invalid).toBeTrue();
    editor.alVolverDelPreview();
    expect(editor.form.valid).toBeTrue();
    expect(nombre.value).toBe('');
    expect(imagen.get('imagen_zoom')?.value).toBe(0.8);
    expect(imagen.get('imagen_x')?.value).toBe(30);
    expect(imagen.dirty).toBeTrue();
  });

  it('mantiene los errores reales de URL obligatoria', () => {
    imagen.get('imagen_url')?.setValue('');
    editor.alVolverDelPreview();
    expect(editor.form.invalid).toBeTrue();
    expect(imagen.get('imagen_url')?.hasError('required')).toBeTrue();
  });

  it('libera un bloqueo residual y permite volver a abrir la misma imagen', () => {
    document.body.classList.add('modal-locked');
    editor.alVolverDelPreview();
    expect(document.body.classList.contains('modal-locked')).toBeFalse();
    editor.editarImagenDesdeGestor({ id: 42, draftKey: 'imagen-42' } as FolderImageManagerImage);
    expect(editor.editorImagenAbierto).toBeTrue();
    expect(editor.imagenEditandoControl).toBe(imagen);
    expect(document.body.classList.contains('modal-locked')).toBeTrue();
  });

  it('no desbloquea los clics de fondo si sigue abierto un modal', () => {
    const modal = document.createElement('div');
    modal.className = 'modal-blocker';
    document.body.appendChild(modal);
    document.body.classList.add('modal-locked');
    try {
      editor.alVolverDelPreview();
      expect(document.body.classList.contains('modal-locked')).toBeTrue();
    } finally {
      modal.remove();
    }
  });
});
