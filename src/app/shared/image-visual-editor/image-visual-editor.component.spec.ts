import { nuevaConfiguracionFondo } from 'app/core/imagen-fondo-visual';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ImageVisualEditorComponent } from './image-visual-editor.component';

describe('ImageVisualEditorComponent', () => {
  let editor: ImageVisualEditorComponent;

  beforeEach(() => {
    editor = new ImageVisualEditorComponent();
    editor.value = { url: 'https://example.com/image.jpg', nombre: 'Roma', activo: true, config: nuevaConfiguracionFondo() };
    editor.ngOnInit();
  });

  it('descarta sin modificar los valores originales', () => {
    const cancel = spyOn(editor.cancel, 'emit');
    editor.draft.nombre = 'Lima';
    editor.config.descripciones.es = 'Cambio';
    editor.solicitarCerrar();
    expect(editor.confirmarSalida).toBeTrue();
    expect(cancel).not.toHaveBeenCalled();
    expect(editor.value.nombre).toBe('Roma');
    expect(editor.value.config.descripciones.es).toBeUndefined();
  });

  it('restablece estilos sin borrar el contenido del usuario', () => {
    editor.config.descripciones.es = 'Descripción';
    editor.config.etiqueta_texto = 'Oferta';
    editor.config.imagen_zoom = 2;
    editor.restablecer();
    expect(editor.config.imagen_zoom).toBe(1);
    expect(editor.config.descripciones.es).toBe('Descripción');
    expect(editor.config.etiqueta_texto).toBe('Oferta');
    expect(editor.draft.nombre).toBe('Roma');
  });

  it('guarda una copia normalizada y evita envíos duplicados', () => {
    const save = spyOn(editor.save, 'emit');
    editor.config.imagen_zoom = 99;
    editor.guardar();
    expect(save.calls.mostRecent().args[0].config.imagen_zoom).toBe(3);
    editor.saving = true;
    editor.guardar();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rechaza nombres vacíos y protocolos no admitidos', () => {
    const save = spyOn(editor.save, 'emit');
    editor.draft.url = 'javascript:alert(1)';
    editor.guardar();
    expect(save).not.toHaveBeenCalled();
    editor.draft.url = 'https://example.com/image.jpg';
    editor.draft.nombre = ' ';
    expect(editor.valid).toBeFalse();
  });

  it('posiciona los textos de forma independiente al encuadre', () => {
    editor.textoSeleccionado = 'descripcion';
    editor.seleccionarPosicion(96, 4);
    editor.cambiarZoom(0.2);
    expect(editor.config.descripcion_x).toBe(96);
    expect(editor.config.descripcion_y).toBe(4);
    expect(editor.config.titulo_x).toBe(50);
    expect(editor.config.imagen_x).toBe(50);
  });
});

describe('ImageVisualEditorComponent renderizado', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ImageVisualEditorComponent], providers: [provideNoopAnimations()] }).compileComponents();
  });

  it('abre el editor sin carpetas, muestra los controles y permite simular dispositivos', async () => {
    const fixture = TestBed.createComponent(ImageVisualEditorComponent);
    fixture.componentRef.setInput('value', { url: '', nombre: 'Roma', activo: true, config: nuevaConfiguracionFondo() });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Carpeta');
    expect(host.textContent).toContain('Zoom y encuadre');
    expect(host.querySelector('app-image-visual-preview')).not.toBeNull();
    fixture.componentInstance.vistaDispositivos = true;
    fixture.detectChanges();
    expect(host.querySelectorAll('[role="dialog"]').length).toBe(2);
    expect(host.textContent).toContain('Móvil');
    expect(host.querySelectorAll('app-image-visual-preview').length).toBe(2);
    fixture.destroy();
  });

  it('en imágenes de fondo ofrece solo nombre y color, sin posicionamiento ni tamaño', async () => {
    const fixture = TestBed.createComponent(ImageVisualEditorComponent);
    const config = nuevaConfiguracionFondo();
    config.descripciones.es = 'Descripción anterior';
    config.etiqueta_texto = 'Etiqueta anterior';
    fixture.componentRef.setInput('value', { url: '', nombre: 'Roma', activo: true, config });
    fixture.componentRef.setInput('nameOnly', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-tp-textarea')).toBeNull();
    expect(host.textContent).not.toContain('Texto de etiqueta');
    expect(host.textContent).not.toContain('Posicionamiento');
    expect(host.textContent).not.toContain('Presentación');
    expect(host.textContent).not.toContain('Descripción anterior');
    expect(host.textContent).not.toContain('Etiqueta anterior');
    expect(host.querySelector('input[type="range"]')).toBeNull();
    expect(host.querySelectorAll('app-color-picker').length).toBe(1);
    expect(host.textContent).toContain('Color del nombre');
    expect(fixture.componentInstance.textos).toEqual(['titulo']);
    expect(fixture.componentInstance.objetivos).toEqual(['imagen', 'titulo']);
    fixture.componentInstance.vistaDispositivos = true;
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Descripción anterior');
    expect(host.textContent).not.toContain('Etiqueta anterior');
    fixture.destroy();
  });
});
