import { EditarActividadDestinoComponent } from './editar-actividad-destino/editar-actividad-destino.component';
import { EditarPreviewDestinoComponent } from './editar-preview-destino/editar-preview-destino.component';

describe('Guardado obligatorio antes del preview público', () => {
  let navigate: jasmine.Spy;
  let toast: jasmine.Spy;

  function prepararEditor<T extends object>(prototype: T): T {
    const editor = Object.create(prototype);
    Object.assign(editor, {
      destinoId: 21385,
      actividadId: 117,
      cargando: false,
      eliminandoActividadIndex: null,
      abriendoPreview: false,
      error: '',
      router: { navigate },
      route: { snapshot: { queryParams: { tipo: 'NACIONAL' } } },
      toast: { show: toast }
    });
    return editor;
  }

  beforeEach(() => {
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    toast = jasmine.createSpy('toast');
  });

  it('espera el guardado del destino y evita guardados duplicados mientras está pendiente', async () => {
    const editor = prepararEditor(EditarPreviewDestinoComponent.prototype);
    let finalizar!: (guardado: boolean) => void;
    const guardar = spyOn(editor, 'guardar').and.returnValue(new Promise<boolean>((resolve) => finalizar = resolve));

    const apertura = editor.verPreview();
    await editor.verPreview();
    expect(guardar).toHaveBeenCalledOnceWith(false);
    expect(navigate).not.toHaveBeenCalled();

    finalizar(true);
    await apertura;
    expect(navigate).toHaveBeenCalledOnceWith(
      ['/admin/destinos/configurar-destinos/preview', 21385, 'vista-publica'],
      { queryParams: { tipo: 'NACIONAL' } }
    );
    expect(editor.abriendoPreview).toBeFalse();
  });

  it('permanece en el editor del destino cuando el guardado falla', async () => {
    const editor = prepararEditor(EditarPreviewDestinoComponent.prototype);
    spyOn(editor, 'guardar').and.resolveTo(false);
    await editor.verPreview();
    expect(navigate).not.toHaveBeenCalled();
    expect(editor.abriendoPreview).toBeFalse();
  });

  it('no guarda ni navega si la actividad contiene datos inválidos', async () => {
    const editor = prepararEditor(EditarActividadDestinoComponent.prototype);
    const markAllAsTouched = jasmine.createSpy('markAllAsTouched');
    Object.defineProperty(editor, 'form', { value: { invalid: true, markAllAsTouched } });
    const guardar = spyOn(editor, 'guardar');
    await editor.verPreview();
    expect(markAllAsTouched).toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
    expect(guardar).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('no abre el preview si los textos se guardan pero las imágenes fallan', async () => {
    const editor = prepararEditor(EditarActividadDestinoComponent.prototype);
    Object.defineProperty(editor, 'form', { value: { invalid: false } });
    Object.defineProperty(editor, 'imagenesArray', { get: () => ({ length: 1 }) });
    spyOn(editor, 'guardar').and.resolveTo(true);
    spyOn(editor, 'guardarImagenes').and.resolveTo(false);
    await editor.verPreview();
    expect(navigate).not.toHaveBeenCalled();
    expect(editor.abriendoPreview).toBeFalse();
  });

  it('guarda textos e imágenes de la actividad antes de navegar', async () => {
    const editor = prepararEditor(EditarActividadDestinoComponent.prototype);
    Object.defineProperty(editor, 'form', { value: { invalid: false } });
    Object.defineProperty(editor, 'imagenesArray', { get: () => ({ length: 1 }) });
    const guardar = spyOn(editor, 'guardar').and.resolveTo(true);
    const imagenes = spyOn(editor, 'guardarImagenes').and.resolveTo(true);
    await editor.verPreview();
    expect(guardar).toHaveBeenCalledBefore(imagenes);
    expect(imagenes).toHaveBeenCalledBefore(navigate);
    expect(navigate).toHaveBeenCalledOnceWith(
      ['/admin/destinos/configurar-destinos/preview', 21385, 'actividad', 117, 'vista-publica'],
      { queryParams: { tipo: 'NACIONAL' } }
    );
    expect(editor.abriendoPreview).toBeFalse();
  });
});
