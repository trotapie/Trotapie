import { FormControl, FormGroup } from '@angular/forms';
import { PRESENTACION_TEXTO_PREDETERMINADA } from 'app/core/estilo-textos-imagen';
import { EditarActividadDestinoComponent } from './editar-actividad-destino.component';

describe('Posicionamiento independiente de textos', () => {
  let editor: EditarActividadDestinoComponent;
  let control: FormGroup;
  let stage: HTMLDivElement;
  let titulo: HTMLParagraphElement;

  beforeEach(() => {
    // Exercise the position methods without loading the full activity screen.
    editor = Object.create(EditarActividadDestinoComponent.prototype);
    control = new FormGroup({
      titulo_color: new FormControl('#FFAA00'),
      titulo_posicion: new FormControl<string | null>(null),
      titulo_x: new FormControl<number | null>(null),
      titulo_y: new FormControl<number | null>(null),
      descripcion_color: new FormControl('#00AAFF'),
      descripcion_posicion: new FormControl('custom'),
      descripcion_x: new FormControl(60),
      descripcion_y: new FormControl(70)
    });
    Object.defineProperty(editor, 'imagenEditandoControl', { get: () => control });
    editor.textoSeleccionado = 'titulo';
    stage = document.createElement('div');
    stage.className = 'image-edit-modal__media-stage';
    titulo = document.createElement('p');
    titulo.dataset['texto'] = 'titulo';
    stage.appendChild(titulo);
    document.body.appendChild(stage);
    spyOn(stage, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 1000, 500));
    spyOn(titulo, 'getBoundingClientRect').and.returnValue(new DOMRect(100, 100, 200, 50));
    spyOn(stage, 'setPointerCapture');
  });

  afterEach(() => stage.remove());

  it('edita y restablece la presentación de un texto sin cambiar los otros destinos', () => {
    const grupoPresentacion = () => new FormGroup({
      oscurecer_fondo: new FormControl(false), efecto_activo: new FormControl(true),
      overlay_color: new FormControl('#FFAA00'), overlay_opacidad: new FormControl(0.5), blur_px: new FormControl(10)
    });
    control.addControl('titulo_presentacion', grupoPresentacion());
    control.addControl('descripcion_presentacion', grupoPresentacion());
    control.addControl('blur_px', new FormControl(4));
    editor.objetivoPresentacion = 'titulo';
    editor.getPresentacionControl('blur_px')?.setValue(18);
    editor.getPresentacionControl('oscurecer_fondo')?.setValue(true);
    expect(editor.getPresentacionTextoPreview('titulo').blur_px).toBe(18);
    expect(editor.getPresentacionTextoPreview('descripcion').blur_px).toBe(10);
    expect(control.get('blur_px')?.value).toBe(4);
    editor.restablecerPresentacion('blur_px');
    expect(editor.getPresentacionTextoPreview('titulo').blur_px).toBe(PRESENTACION_TEXTO_PREDETERMINADA.blur_px);
    expect(editor.getPresentacionTextoPreview('titulo').oscurecer_fondo).toBeTrue();
    expect(editor.getPresentacionTextoPreview('descripcion').oscurecer_fondo).toBeFalse();
    editor.objetivoPresentacion = 'imagen';
    editor.getPresentacionControl('blur_px')?.setValue(8);
    expect(control.get('blur_px')?.value).toBe(8);
    expect(editor.getPresentacionTextoPreview('descripcion').blur_px).toBe(10);
  });

  it('arrastra solo el título sin saltar al punto donde se presionó', () => {
    const descripcionOriginal = {
      color: control.get('descripcion_color')?.value,
      posicion: control.get('descripcion_posicion')?.value,
      x: control.get('descripcion_x')?.value,
      y: control.get('descripcion_y')?.value
    };
    const inicio = new PointerEvent('pointerdown', { button: 0, clientX: 110, clientY: 110 });
    Object.defineProperty(inicio, 'currentTarget', { value: titulo });
    editor.iniciarArrastreTexto(inicio, 'titulo');
    expect(control.get('titulo_x')?.value).toBe(20);
    expect(control.get('titulo_y')?.value).toBe(25);
    editor.moverOverlayPersonalizado(new PointerEvent('pointermove', { clientX: 210, clientY: 160 }));
    expect(control.get('titulo_x')?.value).toBe(30);
    expect(control.get('titulo_y')?.value).toBe(35);
    expect(control.get('titulo_color')?.value).toBe('#FFAA00');
    expect({
      color: control.get('descripcion_color')?.value,
      posicion: control.get('descripcion_posicion')?.value,
      x: control.get('descripcion_x')?.value,
      y: control.get('descripcion_y')?.value
    }).toEqual(descripcionOriginal);
    editor.terminarArrastreOverlay();
    editor.moverOverlayPersonalizado(new PointerEvent('pointermove', { clientX: 900, clientY: 400 }));
    expect(control.get('titulo_x')?.value).toBe(30);
  });

  it('aplica y restablece una posición solo al texto seleccionado', () => {
    editor.textoSeleccionado = 'descripcion';
    editor.seleccionarPosicionTexto('top-right');
    expect(control.get('descripcion_posicion')?.value).toBe('top-right');
    expect(control.get('descripcion_x')?.value).toBe(100);
    expect(control.get('descripcion_y')?.value).toBe(0);
    expect(control.get('titulo_posicion')?.value).toBeNull();
    editor.restablecerPosicionTexto();
    expect(control.get('descripcion_posicion')?.value).toBeNull();
    expect(control.get('descripcion_x')?.value).toBeNull();
    expect(control.get('descripcion_color')?.value).toBe('#00AAFF');
  });
});
