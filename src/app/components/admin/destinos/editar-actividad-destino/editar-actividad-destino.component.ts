import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IDriveActividadImportFolder,
  IDriveActividadImportImage,
  IIdiomaPreviewAdmin,
  IPreviewDestinoAdmin,
  SupabaseService
} from 'app/core/supabase.service';
import { BlockingLoaderComponent } from 'app/shared/blocking-loader/blocking-loader.component';
import {
  FolderImageManagerComponent,
  FolderImageManagerFolder,
  FolderImageManagerImage
} from 'app/shared/folder-image-manager/folder-image-manager.component';
import { MaterialModule } from 'app/shared/material.module';

interface ILangConfig {
  code: string;
  label: string;
}

type DriveActividadFolderDraft = {
  id: string;
  nombre: string;
  imagenes: IDriveActividadImportImage[];
  seleccionado: boolean;
  carpetaDestinoId: number | null;
  carpetaDestinoNombre: string;
};

type ImagenActividadForm = {
  draft_key?: string | null;
  id: number | null;
  imagen_url: string;
  carpeta_id: number | null;
  carpeta_nombre: string | null;
  carpeta: string | null;
  nombre: string | null;
  extension: string | null;
  mime_type: string | null;
  size: number | null;
  size_formatted: string | null;
  activa: boolean;
  orden: number | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  created_at: string | null;
};

@Component({
  selector: 'app-editar-actividad-destino',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, FolderImageManagerComponent, BlockingLoaderComponent],
  templateUrl: './editar-actividad-destino.component.html',
  styleUrl: './editar-actividad-destino.component.scss'
})
export class EditarActividadDestinoComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly fb = inject(UntypedFormBuilder);

  private readonly idiomasConfig: ILangConfig[] = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'Inglés' },
    { code: 'pt', label: 'Portugués' },
    { code: 'de', label: 'Alemán' },
    { code: 'fr', label: 'Francés' }
  ];

  cargando = true;
  guardandoImagenes = false;
  guardandoTraducciones = false;
  error = '';
  destinoId = 0;
  actividadId = 0;
  destinoNombre = '';
  actividadNombre = '';
  carpetaActiva = 'Todas';
  editorImagenAbierto = false;
  imagenEditandoIndex: number | null = null;
  imagenSeleccionadaIndex: number | null = null;
  traduciendoActividad = false;
  mostrarModalMoverImagen = false;
  carpetaDestinoMoverImagenId: number | null = null;
  mostrarModalTipoAgregarImagen = false;
  mostrarModalCargaDriveImagenes = false;
  consultandoDriveActividad = false;
  aplicandoCargaDriveActividad = false;
  driveActividadUrl = '';
  carpetasDriveActividad: DriveActividadFolderDraft[] = [];
  mostrarModalConfirmarEliminarCarpeta = false;
  carpetaAEliminar: FolderImageManagerFolder | null = null;
  modalEliminarCarpetaPaso: 'inicio' | 'mover' | 'crear' = 'inicio';
  carpetaDestinoEliminarId: number | null = null;
  nuevaCarpetaEliminarNombre = '';
  procesandoEliminarCarpeta = false;
  procesandoCrearCarpeta = false;
  mostrarModalConfirmarMoverImagen = false;
  imagenAReubicar: {
    draft_key: string;
    imagen_id: number | null;
    imagen_url: string;
    carpeta_origen_id: number | null;
    carpeta_origen_nombre: string;
    carpeta_destino_id: number;
    carpeta_destino_nombre: string;
  } | null = null;
  concentradoTraduccionesActividad: Record<string, { nombre: string; descripcion: string }> = {};
  ultimaLlaveTraduccionActividad = '';
  private pendientesImagenesCarpeta = new Map<string, { carpeta_id: number | null; carpeta_nombre: string; carpeta: string }>();
  private imagenesClaveSecuencia = 0;
  private carpetasTemporalesSecuencia = -1;
  carpetasActividad: Array<{
    id: number;
    nombre: string;
    orden: number | null;
    created_at: string | null;
    updated_at: string | null;
  }> = [];

  idiomas: IIdiomaPreviewAdmin[] = [];

  form = this.fb.group({
    traducciones: this.fb.array([]),
    imagenes: this.fb.array([])
  });

  get traduccionesArray(): UntypedFormArray {
    return this.form.get('traducciones') as UntypedFormArray;
  }

  get imagenesArray(): UntypedFormArray {
    return this.form.get('imagenes') as UntypedFormArray;
  }

  get carpetasDisponibles(): Array<{ nombre: string; total: number }> {
    return this.galeriaCarpetas.map((folder) => ({
      nombre: folder.name,
      total: folder.images.length
    }));
  }

  get imagenesVisibles(): Array<{ control: any; index: number }> {
    return (this.imagenesArray.controls as any[])
      .map((control, index) => ({ control, index }))
      .filter(({ control }) =>
        this.carpetaActiva === 'Todas' || this.normalizarCarpeta(control.get('carpeta')?.value) === this.carpetaActiva
      );
  }

  get galeriaCarpetas(): FolderImageManagerFolder[] {
    const carpetas = new Map<string | number, FolderImageManagerFolder>();
    const carpetasPorNombre = new Map<string, FolderImageManagerFolder>();

    this.carpetasActividad.forEach((carpeta) => {
      const nombre = this.normalizarCarpeta(carpeta.nombre);
      const folderId = this.parseNumber(carpeta.id) ?? this.slugify(nombre);
      if (carpetas.has(folderId)) {
        return;
      }

      const folder: FolderImageManagerFolder = {
        id: folderId,
        name: nombre,
        description: '0 imagenes',
        coverImageUrl: null,
        images: []
      };

      carpetas.set(folderId, folder);
      carpetasPorNombre.set(this.slugify(nombre), folder);
      carpetasPorNombre.set(nombre.toLowerCase(), folder);
    });

    (this.imagenesArray.controls as any[]).forEach((control, index) => {
      const imageUrl = this.limpiarTexto(control.get('imagen_url')?.value);
      if (!imageUrl) {
        return;
      }

      const carpetaId = this.parseNumber(control.get('carpeta_id')?.value);
      const imagenId = this.parseNumber(control.get('id')?.value);
      const draftKey = this.limpiarTexto(control.get('draft_key')?.value) ?? `actividad-imagen-${index}`;
      const carpetaNombre = this.normalizarCarpeta(
        control.get('carpeta_nombre')?.value ?? control.get('carpeta')?.value
      );
      const folderExistente =
        (carpetaId !== null ? carpetas.get(carpetaId) : null) ??
        carpetasPorNombre.get(this.slugify(carpetaNombre)) ??
        carpetasPorNombre.get(carpetaNombre.toLowerCase()) ??
        null;
      const folderId = folderExistente?.id ?? carpetaId ?? this.slugify(carpetaNombre);
      const nombreImagen =
        this.limpiarTexto(control.get('nombre')?.value)
        ?? this.obtenerNombreArchivoDesdeUrl(imageUrl)
        ?? this.obtenerNombreImagen(imageUrl, index);
      const mimeTypeImagen = this.limpiarTexto(control.get('mime_type')?.value);
      const extensionImagen = this.limpiarTexto(control.get('extension')?.value);
      const sizeLabelImagen = this.limpiarTexto(control.get('size_formatted')?.value);
      const image: FolderImageManagerImage = {
        id: imagenId ?? draftKey,
        draftKey,
        name: nombreImagen,
        imageUrl,
        folderId,
        folderName: carpetaNombre,
        typeLabel: mimeTypeImagen ?? extensionImagen,
        extension: extensionImagen,
        mimeType: mimeTypeImagen,
        sizeLabel: sizeLabelImagen
      };

      if (!folderExistente) {
        const nuevaCarpeta: FolderImageManagerFolder = {
          id: folderId,
          name: carpetaNombre,
          description: '',
          coverImageUrl: imageUrl,
          images: []
        };

        carpetas.set(folderId, nuevaCarpeta);
        carpetasPorNombre.set(this.slugify(carpetaNombre), nuevaCarpeta);
        carpetasPorNombre.set(carpetaNombre.toLowerCase(), nuevaCarpeta);
      }

      carpetas.get(folderId)?.images.push(image);
    });

    return Array.from(carpetas.values())
      .map((folder) => ({
        ...folder,
        description: `${folder.images.length} imagen${folder.images.length === 1 ? '' : 'es'}`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get imagenPrincipalSeleccionadaId(): string | null {
    const activeIndex = (this.imagenesArray.controls as any[]).findIndex((control) => Boolean(control.get('activa')?.value));
    if (activeIndex < 0) {
      return null;
    }

    const control = this.imagenesArray.at(activeIndex);
    return String(
      this.parseNumber(control?.get('id')?.value)
      ?? this.limpiarTexto(control?.get('draft_key')?.value)
      ?? `actividad-imagen-${activeIndex}`
    );
  }

  get imagenSeleccionadaGestorId(): string | null {
    if (this.imagenSeleccionadaIndex !== null) {
      const control = this.imagenesArray.at(this.imagenSeleccionadaIndex);
      return String(
        this.parseNumber(control?.get('id')?.value)
        ?? this.limpiarTexto(control?.get('draft_key')?.value)
        ?? `actividad-imagen-${this.imagenSeleccionadaIndex}`
      );
    }

    if (this.imagenEditandoIndex !== null) {
      const control = this.imagenesArray.at(this.imagenEditandoIndex);
      return String(
        this.parseNumber(control?.get('id')?.value)
        ?? this.limpiarTexto(control?.get('draft_key')?.value)
        ?? `actividad-imagen-${this.imagenEditandoIndex}`
      );
    }

    return this.imagenPrincipalSeleccionadaId;
  }

  get imagenEditandoControl(): any | null {
    if (this.imagenEditandoIndex === null) {
      return null;
    }

    return this.imagenesArray.at(this.imagenEditandoIndex) ?? null;
  }

  get carpetaEditandoSeleccionadaId(): number | null {
    const control = this.imagenEditandoControl;
    if (!control) {
      return null;
    }

    const carpetaId = this.parseNumber(control.get('carpeta_id')?.value);
    if (carpetaId !== null && this.carpetasActividad.some((item) => Number(item.id) === carpetaId)) {
      return carpetaId;
    }

    const carpetaNombre = this.normalizarCarpeta(
      control.get('carpeta_nombre')?.value ?? control.get('carpeta')?.value
    ).toLowerCase();

    const carpetaPorNombre = this.carpetasActividad.find(
      (item) => this.normalizarCarpeta(item.nombre).toLowerCase() === carpetaNombre
    );

    return carpetaPorNombre ? Number(carpetaPorNombre.id) : null;
  }

  get imagenEditandoId(): number | null {
    const control = this.imagenEditandoControl;
    if (!control) {
      return null;
    }

    return this.parseNumber(control.get('id')?.value);
  }

  get imagenEditandoEsActiva(): boolean {
    return Boolean(this.imagenEditandoControl?.get('activa')?.value);
  }

  get imagenEditandoTitulo(): string {
    const nombre = this.limpiarTexto(this.imagenEditandoControl?.get('nombre')?.value);
    if (nombre) {
      return nombre;
    }

    const imageUrl = this.limpiarTexto(this.imagenEditandoControl?.get('imagen_url')?.value);
    if (!imageUrl) {
      return 'Imagen seleccionada';
    }

    return this.obtenerNombreImagen(imageUrl, this.imagenEditandoIndex ?? 0);
  }

  get imagenEditandoFechaTexto(): string {
    const rawDate = this.imagenEditandoControl?.get('created_at')?.value;
    if (!rawDate) {
      return 'Sin fecha';
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  get puedeEliminarImagenEditando(): boolean {
    return !!this.imagenEditandoControl && !this.imagenEditandoEsActiva && this.imagenesArray.length > 1;
  }

  get carpetasParaSelector(): Array<{ id: number; nombre: string }> {
    return [...this.carpetasActividad]
      .map((carpeta) => ({
        id: Number(carpeta.id),
        nombre: this.normalizarCarpeta(carpeta.nombre)
      }))
      .filter((carpeta) => carpeta.nombre !== 'Sin carpeta')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get carpetasParaMoverEliminar(): Array<{ id: number; nombre: string }> {
    const carpetaOrigenId = this.parseNumber(this.carpetaAEliminar?.id ?? null);
    return this.carpetasParaSelector.filter((carpeta) => carpeta.id !== carpetaOrigenId);
  }

  get carpetasDestinoParaImagen(): Array<{ id: number; nombre: string }> {
    const carpetaActualId = this.carpetaEditandoSeleccionadaId;
    return this.carpetasParaSelector.filter((carpeta) => carpeta.id !== carpetaActualId);
  }

  get hayCarpetasDriveActividad(): boolean {
    return this.carpetasDriveActividad.length > 0;
  }

  get totalImagenesDriveActividadSeleccionadas(): number {
    return this.carpetasDriveActividad
      .filter((carpeta) => carpeta.seleccionado)
      .reduce((total, carpeta) => total + carpeta.imagenes.length, 0);
  }

  get todasLasCarpetasDriveSeleccionadas(): boolean {
    return this.carpetasDriveActividad.length > 0 && this.carpetasDriveActividad.every((carpeta) => carpeta.seleccionado);
  }

  get indiceIdiomaEspanol(): number {
    return this.idiomas.findIndex((idioma) => idioma.codigo === 'es');
  }

  get traduccionPrincipalControl(): any | null {
    const index = this.indiceIdiomaEspanol;
    return index >= 0 ? this.traduccionesArray.at(index) : null;
  }

  async ngOnInit() {
    const destinoRaw = this.route.snapshot.paramMap.get('id');
    const actividadRaw = this.route.snapshot.paramMap.get('actividadId');
    const destinoId = Number(destinoRaw);
    const actividadId = Number(actividadRaw);

    if (!destinoRaw || !actividadRaw || !Number.isFinite(destinoId) || !Number.isFinite(actividadId)) {
      this.error = 'No se encontro la actividad solicitada.';
      this.cargando = false;
      return;
    }

    this.destinoId = destinoId;
    this.actividadId = actividadId;

    try {
      const preview = await this.supabase.obtenerPreviewDestinoAdmin(destinoId);
      const actividad = (preview.actividades ?? []).find((item) => Number(item.id) === actividadId);

      console.log('[Editar actividad destino] Preview recibido:', {
        destino_id: destinoId,
        actividad_id: actividadId,
        total_actividades: preview.actividades?.length ?? 0,
        actividades: (preview.actividades ?? []).map((item: any) => ({
          id: item.id,
          total_imagenes: item.imagenes?.length ?? 0,
          imagenes: item.imagenes
        }))
      });

      if (!actividad) {
        throw new Error('No se encontro la actividad solicitada.');
      }

      console.log('[Editar actividad destino] Actividad seleccionada:', {
        destino_id: destinoId,
        actividad_id: actividadId,
        total_imagenes: actividad.imagenes?.length ?? 0,
        imagenes: actividad.imagenes
      });

      this.destinoNombre = preview.destino_nombre;
      this.actividadNombre = this.obtenerNombreActividad(actividad, preview);
      this.idiomas = this.ordenarIdiomas(preview.idiomas);
      this.carpetasActividad = actividad.carpetas ?? [];

      const traducciones = this.idiomas.map((idioma) =>
        this.fb.group({
          idioma_id: [idioma.id],
          codigo: [idioma.codigo],
          nombre: [actividad.traducciones?.[idioma.id]?.nombre ?? ''],
          descripcion: [actividad.traducciones?.[idioma.id]?.descripcion ?? '']
        })
      );

      this.form.setControl('traducciones', this.fb.array(traducciones));
      this.form.setControl('imagenes', this.buildImagenesFormArray(actividad.imagenes ?? []));
      this.carpetaActiva = this.carpetasDisponibles[0]?.nombre ?? 'Todas';
      this.normalizarOrdenImagenes();
      this.concentradoTraduccionesActividad = this.construirConcentradoTraduccionesDesdeActividad(actividad);
      this.ultimaLlaveTraduccionActividad = this.obtenerLlaveTraduccionEspanol();

      console.log('[Editar actividad destino] FormArray de imagenes construido:', {
        actividad_id: actividadId,
        total_form_array: this.imagenesArray.length,
        carpetas: this.carpetasDisponibles,
        galeria_carpetas: this.galeriaCarpetas,
        imagenes_form: this.imagenesArray.getRawValue()
      });
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo cargar la actividad.';
    } finally {
      this.cargando = false;
    }
  }

  ngOnDestroy(): void {
    this.setModalLocked(false);
  }

  regresar() {
    this.router.navigate(['/admin/destinos/configurar-destinos/preview/' + this.destinoId]);
  }

  seleccionarCarpeta(nombre: string) {
    this.carpetaActiva = nombre;
  }

  onCarpetaImagenChange(valor: number | string | null) {
    if (!this.imagenEditandoControl) {
      return;
    }

    const draftKey = this.getImagenEditandoDraftKey();
    if (!draftKey) {
      return;
    }

    if (valor === null || valor === undefined || valor === '') {
      return;
    }

    const carpetaId = this.parseNumber(valor);
    const carpeta = this.carpetasActividad.find((item) => Number(item.id) === carpetaId);
    const carpetaNombre = carpeta ? this.normalizarCarpeta(carpeta.nombre) : this.normalizarCarpeta(valor);

    this.establecerCarpetaPendiente(draftKey, carpetaId, carpetaNombre);

    console.log('[Editar actividad destino] Carpeta de imagen marcada como pendiente:', {
      imagen_index: this.imagenEditandoIndex,
      valor_recibido: valor,
      carpeta_id: carpetaId,
      carpeta_nombre: carpetaNombre,
      imagen: this.imagenEditandoControl.getRawValue(),
      draft_key: draftKey
    });
  }

  async crearCarpetaActividad(nombre: string) {
    const limpio = this.normalizarCarpeta(nombre);
    if (!limpio || limpio === 'Sin carpeta') {
      return;
    }

    this.procesandoCrearCarpeta = true;
    try {
      await this.supabase.crearCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        nombre: limpio
      });

      await this.ngOnInit();
      this.carpetaActiva = limpio;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo crear la carpeta.';
    } finally {
      this.procesandoCrearCarpeta = false;
    }
  }

  async renombrarCarpetaActividad(
    carpeta: FolderImageManagerFolder,
    nombre: string
  ): Promise<void> {
    const limpio = this.normalizarCarpeta(nombre);
    const carpetaId = this.parseNumber(carpeta?.id ?? null);
    if (carpetaId === null) {
      this.error = 'No se pudo identificar la carpeta a renombrar.';
      return;
    }

    if (!limpio || limpio === 'Sin carpeta') {
      this.error = 'Escribe un nombre de carpeta valido.';
      return;
    }

    try {
      const respuesta = await this.supabase.renombrarCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_id: carpetaId,
        nombre: limpio
      });

      this.carpetasActividad = this.carpetasActividad.map((item) =>
        Number(item.id) === carpetaId
          ? {
              ...item,
              nombre: limpio,
              updated_at: respuesta?.updated_at ?? item.updated_at ?? null
            }
          : item
      );

      const controles = this.imagenesArray.controls as any[];
      controles.forEach((control) => {
        if (this.parseNumber(control.get('carpeta_id')?.value) !== carpetaId) {
          return;
        }

        control.patchValue(
          {
            carpeta_nombre: limpio,
            carpeta: limpio
          },
          { emitEvent: false }
        );
      });

      if (this.carpetaActiva !== 'Todas' && this.normalizarCarpeta(this.carpetaActiva).toLowerCase() === this.normalizarCarpeta(carpeta.name).toLowerCase()) {
        this.carpetaActiva = limpio;
      }
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo renombrar la carpeta.';
    }
  }

  confirmarMoverImagenPendiente(payload: {
    draft_key: string;
    imagen_id: number | null;
    imagen_url: string;
    carpeta_origen_id: number | null;
    carpeta_origen_nombre: string;
    carpeta_destino_id: number;
    carpeta_destino_nombre: string;
  }): void {
    this.imagenAReubicar = payload;
    this.mostrarModalConfirmarMoverImagen = true;
    this.setModalLocked(true);
  }

  solicitarMoverImagenDesdeGestor(evento: { image: FolderImageManagerImage; folder: FolderImageManagerFolder }): void {
    console.log('imageneeeeeeen ',evento);
    
    const imagenId = this.parseNumber(evento.image.id);
    const carpetaOrigenId = this.parseNumber(evento.image.folderId ?? null);
    const carpetaDestinoId = this.parseNumber(evento.folder.id);

    if (carpetaDestinoId === null) {
      return;
    }

    this.confirmarMoverImagenPendiente({
      draft_key: evento.image.draftKey ?? String(evento.image.id),
      imagen_id: imagenId,
      imagen_url: evento.image.imageUrl,
      carpeta_origen_id: carpetaOrigenId,
      carpeta_origen_nombre: this.normalizarCarpeta(evento.image.folderName ?? ''),
      carpeta_destino_id: carpetaDestinoId,
      carpeta_destino_nombre: this.normalizarCarpeta(evento.folder.name)
    });
  }

  cancelarMoverImagenPendiente(): void {
    this.mostrarModalConfirmarMoverImagen = false;
    this.imagenAReubicar = null;
    this.setModalLocked(false);
  }

  aceptarMoverImagenPendiente(): void {
    if (!this.imagenAReubicar) {
      return;
    }

    void this.moverImagenAhora(this.imagenAReubicar);
  }

  async eliminarCarpetaActividad(carpeta: FolderImageManagerFolder) {
    this.carpetaAEliminar = carpeta;
    this.mostrarModalConfirmarEliminarCarpeta = true;
    this.modalEliminarCarpetaPaso = 'inicio';
    this.carpetaDestinoEliminarId = this.carpetasParaMoverEliminar[0]?.id ?? null;
    this.nuevaCarpetaEliminarNombre = '';
    this.setModalLocked(true);
  }

  cerrarModalConfirmarEliminarCarpeta() {
    this.mostrarModalConfirmarEliminarCarpeta = false;
    this.carpetaAEliminar = null;
    this.modalEliminarCarpetaPaso = 'inicio';
    this.carpetaDestinoEliminarId = null;
    this.nuevaCarpetaEliminarNombre = '';
    this.procesandoEliminarCarpeta = false;
    this.setModalLocked(false);
  }

  private cerrarModalMoverImagenPendiente(): void {
    this.mostrarModalConfirmarMoverImagen = false;
    this.imagenAReubicar = null;
    this.setModalLocked(false);
  }

  private async moverImagenAhora(payload: {
    draft_key: string;
    imagen_id: number | null;
    imagen_url: string;
    carpeta_origen_id: number | null;
    carpeta_origen_nombre: string;
    carpeta_destino_id: number;
    carpeta_destino_nombre: string;
  }): Promise<void> {
   console.log(payload);
   
    const imagenId = payload.imagen_id;
    if (imagenId === null) {
      this.error = 'No se pudo identificar la imagen para moverla.';
      return;
    }

    if (this.guardandoImagenes || this.guardandoTraducciones) {
      return;
    }

    this.error = '';
    this.guardandoImagenes = true;

    try {
      await this.supabase.moverImagenActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        imagen_id: imagenId,
        carpeta_destino_id: payload.carpeta_destino_id
      });

      const indice = (this.imagenesArray.controls as any[]).findIndex(
        (control) => this.parseNumber(control.get('id')?.value) === imagenId
      );

      if (indice >= 0) {
        const control = this.imagenesArray.at(indice);
        control.patchValue(
          {
            carpeta_id: payload.carpeta_destino_id,
            carpeta_nombre: payload.carpeta_destino_nombre,
            carpeta: payload.carpeta_destino_nombre
          },
          { emitEvent: false }
        );
      }

      this.pendientesImagenesCarpeta.delete(payload.draft_key);
      this.carpetaActiva = payload.carpeta_destino_nombre;
      this.normalizarOrdenImagenes();
      this.cerrarModalMoverImagenPendiente();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo mover la imagen.';
    } finally {
      this.guardandoImagenes = false;
    }
  }

  async ejecutarAccionEliminarCarpeta(
    accion: 'delete_empty' | 'delete_images' | 'move_existing' | 'create_and_move'
  ): Promise<void> {
    if (!this.carpetaAEliminar) {
      return;
    }

    const carpetaId = this.parseNumber(this.carpetaAEliminar.id);
    if (carpetaId === null) {
      this.error = 'No se pudo identificar la carpeta a eliminar.';
      return;
    }

    if (this.procesandoEliminarCarpeta) {
      return;
    }

    if (accion === 'delete_images' && this.carpetaContieneImagenActiva(carpetaId)) {
      this.error = 'Esta carpeta contiene la imagen principal. Primero marca otra imagen como principal.';
      return;
    }

    if (accion === 'move_existing' && this.carpetaDestinoEliminarId === null) {
      this.error = 'Selecciona una carpeta de destino.';
      return;
    }

    if (accion === 'create_and_move') {
      const nombre = this.normalizarCarpeta(this.nuevaCarpetaEliminarNombre);
      if (!nombre || nombre === 'Sin carpeta') {
        this.error = 'Escribe un nombre de carpeta valido.';
        return;
      }
    }

    this.procesandoEliminarCarpeta = true;
    this.error = '';

    try {
      const respuesta: any = await this.supabase.administrarCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_id: carpetaId,
        accion,
        carpeta_destino_id: accion === 'move_existing' ? this.carpetaDestinoEliminarId : null,
        nueva_carpeta_nombre: accion === 'create_and_move' ? this.nuevaCarpetaEliminarNombre : null
      });

      if (accion === 'delete_empty' || accion === 'delete_images') {
        this.removerCarpetaLocal(carpetaId);
        this.eliminarImagenesLocalesPorCarpetaId(carpetaId);
      } else if (accion === 'move_existing' || accion === 'create_and_move') {
        const carpetaDestinoId = this.parseNumber(respuesta?.carpeta_destino_id ?? this.carpetaDestinoEliminarId);
        const carpetaDestinoNombre = this.normalizarCarpeta(
          respuesta?.carpeta_destino_nombre ?? this.nuevaCarpetaEliminarNombre
        );

        if (carpetaDestinoId === null) {
          throw new Error('No se pudo resolver la carpeta destino.');
        }

        this.moverImagenesLocales(carpetaId, carpetaDestinoId, carpetaDestinoNombre);
        this.removerCarpetaLocal(carpetaId);

        if (accion === 'create_and_move' && !this.carpetasActividad.some((item) => Number(item.id) === carpetaDestinoId)) {
          this.carpetasActividad = [
            ...this.carpetasActividad,
            {
              id: carpetaDestinoId,
              nombre: carpetaDestinoNombre,
              orden: null,
              created_at: null,
              updated_at: null
            }
          ];
        }
      }

      this.carpetaActiva = 'Todas';
      this.cerrarModalConfirmarEliminarCarpeta();
      this.normalizarOrdenImagenes();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo procesar la carpeta.';
    } finally {
      this.procesandoEliminarCarpeta = false;
    }
  }

  private removerCarpetaLocal(carpetaId: number): void {
    this.carpetasActividad = this.carpetasActividad.filter((item) => Number(item.id) !== carpetaId);
  }

  private eliminarImagenesLocalesPorCarpetaId(carpetaId: number): void {
    const controles = this.imagenesArray.controls as any[];
    const indices = controles
      .map((control, index) => ({ control, index }))
      .filter(({ control }) => this.parseNumber(control.get('carpeta_id')?.value) === carpetaId)
      .map(({ index }) => index)
      .sort((a, b) => b - a);

    if (!indices.length) {
      return;
    }

    if (this.imagenEditandoIndex !== null) {
      if (indices.includes(this.imagenEditandoIndex)) {
        this.cerrarEditorImagen();
      } else {
        const removidasAntes = indices.filter((index) => index < this.imagenEditandoIndex!).length;
        this.imagenEditandoIndex -= removidasAntes;
      }
    }

    indices.forEach((index) => this.imagenesArray.removeAt(index));
  }

  private carpetaContieneImagenActiva(carpetaId: number): boolean {
    return (this.imagenesArray.controls as any[]).some(
      (control) =>
        this.parseNumber(control.get('carpeta_id')?.value) === carpetaId
        && Boolean(control.get('activa')?.value)
    );
  }

  private moverImagenesLocales(carpetaOrigenId: number, carpetaDestinoId: number, carpetaDestinoNombre: string): void {
    const controles = this.imagenesArray.controls as any[];
    controles.forEach((control) => {
      if (this.parseNumber(control.get('carpeta_id')?.value) !== carpetaOrigenId) {
        return;
      }

      control.patchValue(
        {
          carpeta_id: carpetaDestinoId,
          carpeta_nombre: carpetaDestinoNombre,
          carpeta: carpetaDestinoNombre
        },
        { emitEvent: false }
      );
    });
  }

  async confirmarEliminarCarpetaActividad() {
    if (!this.carpetaAEliminar) {
      return;
    }

    const carpeta = this.carpetaAEliminar;
    const carpetaId = this.parseNumber(carpeta.id);
    if (carpetaId === null) {
      this.error = 'No se pudo identificar la carpeta a eliminar.';
      return;
    }

    const tieneImagenes = carpeta.images.length > 0;

    if (!tieneImagenes) {
      await this.eliminarCarpetaSinImagenes(carpetaId);
      return;
    }

    if (this.modalEliminarCarpetaPaso === 'inicio') {
      return;
    }

    if (this.modalEliminarCarpetaPaso === 'mover') {
      await this.moverImagenesYEliminarCarpeta(carpetaId);
      return;
    }

    if (this.modalEliminarCarpetaPaso === 'crear') {
      await this.crearNuevaCarpetaYMoverImagenes(carpetaId);
    }
  }

  async eliminarImagenesYCarpeta(carpetaIdInput: number | string): Promise<void> {
    const carpetaId = this.parseNumber(carpetaIdInput);
    if (carpetaId === null) {
      this.error = 'No se pudo identificar la carpeta a eliminar.';
      return;
    }

    if (this.procesandoEliminarCarpeta) {
      return;
    }

    if (this.carpetaContieneImagenActiva(carpetaId)) {
      this.error = 'Esta carpeta contiene la imagen principal. Primero marca otra imagen como principal.';
      return;
    }

    this.procesandoEliminarCarpeta = true;
    try {
      await this.supabase.eliminarCarpetaConImagenesActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_id: carpetaId
      });

      await this.ngOnInit();
      this.carpetaActiva = 'Todas';
      this.cerrarModalConfirmarEliminarCarpeta();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron eliminar las imagenes.';
    } finally {
      this.procesandoEliminarCarpeta = false;
    }
  }

  mostrarPasoMoverCarpeta(): void {
    this.modalEliminarCarpetaPaso = 'mover';
    this.carpetaDestinoEliminarId = this.carpetasParaMoverEliminar[0]?.id ?? null;
  }

  mostrarPasoCrearCarpeta(): void {
    this.modalEliminarCarpetaPaso = 'crear';
    this.nuevaCarpetaEliminarNombre = '';
  }

  volverPasoEliminarCarpeta(): void {
    this.modalEliminarCarpetaPaso = 'inicio';
  }

  async eliminarCarpetaSinImagenes(carpetaId: number): Promise<void> {
    if (this.procesandoEliminarCarpeta) {
      return;
    }

    this.procesandoEliminarCarpeta = true;
    try {
      await this.supabase.eliminarCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_id: carpetaId
      });

      await this.ngOnInit();
      this.carpetaActiva = 'Todas';
      this.cerrarModalConfirmarEliminarCarpeta();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo eliminar la carpeta.';
    } finally {
      this.procesandoEliminarCarpeta = false;
    }
  }

  async moverImagenesYEliminarCarpeta(carpetaIdInput: number | string): Promise<void> {
    const carpetaId = this.parseNumber(carpetaIdInput);
    if (carpetaId === null) {
      this.error = 'No se pudo identificar la carpeta a eliminar.';
      return;
    }

    if (this.procesandoEliminarCarpeta) {
      return;
    }

    const carpetaDestinoId = this.carpetaDestinoEliminarId;
    if (carpetaDestinoId === null) {
      this.error = 'Selecciona una carpeta de destino.';
      return;
    }

    if (carpetaDestinoId === carpetaId) {
      this.error = 'La carpeta destino debe ser diferente.';
      return;
    }

    this.procesandoEliminarCarpeta = true;
    try {
      await this.supabase.moverImagenesCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_origen_id: carpetaId,
        carpeta_destino_id: carpetaDestinoId
      });

      await this.supabase.eliminarCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_id: carpetaId
      });

      await this.ngOnInit();
      this.carpetaActiva = 'Todas';
      this.cerrarModalConfirmarEliminarCarpeta();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo mover las imagenes.';
    } finally {
      this.procesandoEliminarCarpeta = false;
    }
  }

  async crearNuevaCarpetaYMoverImagenes(carpetaIdInput: number | string): Promise<void> {
    const carpetaId = this.parseNumber(carpetaIdInput);
    if (carpetaId === null) {
      this.error = 'No se pudo identificar la carpeta a eliminar.';
      return;
    }

    if (this.procesandoEliminarCarpeta) {
      return;
    }

    const nombre = this.normalizarCarpeta(this.nuevaCarpetaEliminarNombre);
    if (!nombre || nombre === 'Sin carpeta') {
      this.error = 'Escribe un nombre de carpeta valido.';
      return;
    }

    this.procesandoEliminarCarpeta = true;
    try {
      const nuevaCarpeta = await this.supabase.crearCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        nombre
      });

      const nuevaCarpetaId = this.parseNumber(nuevaCarpeta?.id);
      if (nuevaCarpetaId === null) {
        throw new Error('No se pudo crear la nueva carpeta.');
      }

      if (nuevaCarpetaId === carpetaId) {
        throw new Error('La nueva carpeta debe tener un nombre diferente.');
      }

      await this.supabase.moverImagenesCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_origen_id: carpetaId,
        carpeta_destino_id: nuevaCarpetaId
      });

      await this.supabase.eliminarCarpetaActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        carpeta_id: carpetaId
      });

      await this.ngOnInit();
      this.carpetaActiva = 'Todas';
      this.cerrarModalConfirmarEliminarCarpeta();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo crear la nueva carpeta.';
    } finally {
      this.procesandoEliminarCarpeta = false;
    }
  }

  agregarImagen() {
    if (!this.obtenerCarpetaDefaultActividad()) {
      this.error = 'Crea una carpeta antes de agregar imagenes.';
      return;
    }

    this.mostrarModalTipoAgregarImagen = true;
    this.setModalLocked(true);
  }

  cerrarModalTipoAgregarImagen(): void {
    this.mostrarModalTipoAgregarImagen = false;
    this.setModalLocked(this.mostrarModalCargaDriveImagenes);
  }

  seleccionarAgregarImagenManual(): void {
    this.cerrarModalTipoAgregarImagen();
    this.agregarImagenManual();
  }

  seleccionarAgregarImagenDesdeDrive(): void {
    this.mostrarModalTipoAgregarImagen = false;
    this.mostrarModalCargaDriveImagenes = true;
    this.consultandoDriveActividad = false;
    this.aplicandoCargaDriveActividad = false;
    this.driveActividadUrl = '';
    this.carpetasDriveActividad = [];
    this.setModalLocked(true);
  }

  cerrarModalCargaDriveImagenes(): void {
    this.mostrarModalCargaDriveImagenes = false;
    this.consultandoDriveActividad = false;
    this.aplicandoCargaDriveActividad = false;
    this.driveActividadUrl = '';
    this.carpetasDriveActividad = [];
    this.setModalLocked(false);
  }

  async consultarCarpetasDriveActividad(): Promise<void> {
    const driveUrl = this.limpiarTexto(this.driveActividadUrl);
    if (!driveUrl) {
      this.error = 'Pega la URL o el ID de la carpeta de Drive.';
      return;
    }

    this.consultandoDriveActividad = true;
    this.error = '';

    try {
      const folders = await this.supabase.obtenerImagenesActividadDesdeDrive(driveUrl);
      const carpetaDefault = this.obtenerCarpetaDefaultActividad();

      this.carpetasDriveActividad = folders.map((folder, index) => {
        const nombreNormalizado = this.normalizarCarpeta(folder.nombre) || `Carpeta ${index + 1}`;
        const carpetaDestino = this.obtenerCarpetaPorNombre(nombreNormalizado);

        return {
          id: folder.id ?? `${this.slugify(nombreNormalizado)}-${index}`,
          nombre: nombreNormalizado,
          imagenes: folder.imagenes,
          seleccionado: true,
          carpetaDestinoId: carpetaDestino?.id ?? carpetaDefault?.id ?? null,
          carpetaDestinoNombre: carpetaDestino?.nombre ?? nombreNormalizado
        };
      });
    } catch (error: any) {
      this.carpetasDriveActividad = [];
      this.error = error?.message ?? 'No se pudieron consultar las imagenes de Drive.';
    } finally {
      this.consultandoDriveActividad = false;
    }
  }

  toggleSeleccionTodasCarpetasDrive(seleccionar: boolean): void {
    this.carpetasDriveActividad = this.carpetasDriveActividad.map((carpeta) => ({
      ...carpeta,
      seleccionado: seleccionar
    }));
  }

  actualizarCarpetaDestinoDrive(folderId: string, carpetaDestinoId: number | null): void {
    const carpetaDestino = this.carpetasParaSelector.find((item) => item.id === carpetaDestinoId) ?? null;

    this.carpetasDriveActividad = this.carpetasDriveActividad.map((carpeta) => {
      if (carpeta.id !== folderId) {
        return carpeta;
      }

      return {
        ...carpeta,
        carpetaDestinoId: carpetaDestino?.id ?? carpeta.carpetaDestinoId,
        carpetaDestinoNombre: carpetaDestino?.nombre ?? carpeta.carpetaDestinoNombre
      };
    });
  }

  trackByDriveFolder(_: number, folder: DriveActividadFolderDraft): string {
    return `${folder.id}-${folder.nombre}`;
  }

  async cargarImagenesSeleccionadasDesdeDrive(): Promise<void> {
    const carpetasSeleccionadas = this.carpetasDriveActividad.filter((carpeta) => carpeta.seleccionado && carpeta.imagenes.length);
    if (!carpetasSeleccionadas.length) {
      this.error = 'Selecciona al menos una carpeta de Drive para cargar.';
      return;
    }

    const imagenesExistentes = new Set<string>();
    (this.imagenesArray.controls as any[]).forEach((control) => {
      this.construirClavesIdentidadImagen({
        url: control.get('imagen_url')?.value,
        nombre: control.get('nombre')?.value,
        size: control.get('size')?.value
      }).forEach((clave) => imagenesExistentes.add(clave));
    });

    this.aplicandoCargaDriveActividad = true;
    this.error = '';

    try {
      const totalImagenesInicial = this.imagenesArray.length;
      const carpetasIdsAntes = new Set(this.carpetasActividad.map((item) => Number(item.id)));
      let insertadas = 0;

      for (const carpeta of carpetasSeleccionadas) {
        const carpetaLocal = this.asegurarCarpetaLocalDraft(carpeta.carpetaDestinoNombre);
        const carpetaId = carpetaLocal?.id ?? carpeta.carpetaDestinoId ?? null;
        const carpetaNombre = carpetaLocal?.nombre ?? carpeta.carpetaDestinoNombre;

        carpeta.imagenes.forEach((imagen) => {
          const url = this.limpiarTexto(imagen.publicImageUrl);
          const clavesImagen = this.construirClavesIdentidadImagen({
            url,
            nombre: imagen.nombre,
            size: imagen.size
          });

          if (!url || clavesImagen.some((clave) => imagenesExistentes.has(clave))) {
            return;
          }

          this.imagenesArray.push(
            this.fb.group({
              draft_key: [this.generarClaveImagenBorrador()],
              id: [null],
              imagen_url: [url, [Validators.required]],
              carpeta_id: [carpetaId],
              carpeta_nombre: [carpetaNombre],
              carpeta: [carpetaNombre],
              nombre: [this.limpiarTexto(imagen.nombre) ?? this.obtenerNombreArchivoDesdeUrl(url)],
              extension: [this.limpiarTexto(imagen.extension) ?? this.obtenerExtensionArchivo(url)],
              mime_type: [this.limpiarTexto(imagen.mimeType)],
              size: [this.parseNumber(imagen.size)],
              size_formatted: [this.limpiarTexto(imagen.sizeFormatted) ?? this.formatearTamanoArchivo(this.parseNumber(imagen.size))],
              activa: [this.imagenesArray.length === 0 && insertadas === 0],
              orden: [this.imagenesArray.length + 1],
              vigencia_desde: [null],
              vigencia_hasta: [null],
              created_at: [null]
            })
          );

          clavesImagen.forEach((clave) => imagenesExistentes.add(clave));
          insertadas += 1;
        });
      }

      if (!insertadas) {
        this.error = 'No se agregaron imagenes nuevas. Las URLs ya existen en la actividad.';
        return;
      }

      this.normalizarOrdenImagenes();
      const primeraCarpetaSeleccionada = carpetasSeleccionadas[0]?.carpetaDestinoNombre ?? this.carpetaActiva;
      const guardadoOk = await this.guardarImagenes();

      if (!guardadoOk) {
        while (this.imagenesArray.length > totalImagenesInicial) {
          this.imagenesArray.removeAt(this.imagenesArray.length - 1);
        }

        this.carpetasActividad = this.carpetasActividad.filter((item) => {
          const carpetaId = Number(item.id);
          if (carpetasIdsAntes.has(carpetaId)) {
            return true;
          }

          return (this.imagenesArray.controls as any[]).some(
            (control) => this.parseNumber(control.get('carpeta_id')?.value) === carpetaId
          );
        });

        this.normalizarOrdenImagenes();
        return;
      }

      this.editorImagenAbierto = false;
      this.imagenEditandoIndex = null;
      await this.ngOnInit();
      this.carpetaActiva = primeraCarpetaSeleccionada;
      this.cerrarModalCargaDriveImagenes();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron preparar las imagenes desde Drive.';
    } finally {
      this.aplicandoCargaDriveActividad = false;
    }
  }

  private agregarImagenManual() {
    const carpetaInicial =
      this.carpetaActiva !== 'Todas'
        ? this.obtenerCarpetaPorNombre(this.carpetaActiva) ?? this.obtenerCarpetaDefaultActividad()
        : this.obtenerCarpetaDefaultActividad();

    if (!carpetaInicial) {
      this.error = 'Crea una carpeta antes de agregar imagenes.';
      return;
    }

    this.imagenesArray.push(
      this.fb.group({
        draft_key: [this.generarClaveImagenBorrador()],
        id: [null],
        imagen_url: [''],
        carpeta_id: [carpetaInicial.id],
        carpeta_nombre: [carpetaInicial.nombre],
        carpeta: [carpetaInicial.nombre],
        nombre: [null],
        extension: [null],
        mime_type: [null],
        size: [null],
        size_formatted: [null],
        activa: [this.imagenesArray.length === 0],
        orden: [this.imagenesArray.length + 1],
        vigencia_desde: [null],
        vigencia_hasta: [null],
        created_at: [null]
      })
    );
    this.normalizarOrdenImagenes();
    this.abrirEditorImagen(this.imagenesArray.length - 1);
  }

  async eliminarImagen(index: number): Promise<void> {
    if (index < 0 || index >= this.imagenesArray.length) {
      return;
    }

    const control = this.imagenesArray.at(index);
    if (Boolean(control.get('activa')?.value)) {
      this.error = 'No puedes eliminar la imagen principal. Primero marca otra imagen como principal.';
      return;
    }

    if (this.imagenesArray.length <= 1) {
      this.error = 'Debe quedar al menos una imagen en la actividad.';
      return;
    }

    const imagenId = this.parseNumber(control.get('id')?.value);
    const draftKey = this.limpiarTexto(control.get('draft_key')?.value);
    const snapshot = control.getRawValue();
    const pendienteCarpeta = draftKey ? this.pendientesImagenesCarpeta.get(draftKey) ?? null : null;
    const indiceEditandoAnterior = this.imagenEditandoIndex;

    if (draftKey) {
      this.pendientesImagenesCarpeta.delete(draftKey);
    }

    this.imagenesArray.removeAt(index);
    if (this.imagenEditandoIndex === index) {
      this.imagenEditandoIndex = null;
      this.editorImagenAbierto = false;
    } else if (this.imagenEditandoIndex !== null && this.imagenEditandoIndex > index) {
      this.imagenEditandoIndex -= 1;
    }
    this.normalizarOrdenImagenes();

    if (imagenId === null) {
      return;
    }

    const guardadoOk = await this.guardarImagenes();
    if (guardadoOk) {
      return;
    }

    this.imagenesArray.insert(index, this.fb.group({
      draft_key: [snapshot.draft_key ?? this.generarClaveImagenBorrador()],
      id: [this.parseNumber(snapshot.id)],
      imagen_url: [snapshot.imagen_url ?? '', [Validators.required]],
      carpeta_id: [this.parseNumber(snapshot.carpeta_id)],
      carpeta_nombre: [snapshot.carpeta_nombre ?? ''],
      carpeta: [snapshot.carpeta ?? snapshot.carpeta_nombre ?? ''],
      nombre: [snapshot.nombre ?? null],
      extension: [snapshot.extension ?? null],
      mime_type: [snapshot.mime_type ?? null],
      size: [this.parseNumber(snapshot.size)],
      size_formatted: [snapshot.size_formatted ?? null],
      activa: [Boolean(snapshot.activa)],
      orden: [this.parseNumber(snapshot.orden) ?? index + 1],
      vigencia_desde: [this.parseDateValue(snapshot.vigencia_desde)],
      vigencia_hasta: [this.parseDateValue(snapshot.vigencia_hasta)],
      created_at: [snapshot.created_at ?? null]
    }));

    if (draftKey && pendienteCarpeta) {
      this.pendientesImagenesCarpeta.set(draftKey, pendienteCarpeta);
    }

    this.imagenEditandoIndex = indiceEditandoAnterior;
    if (this.imagenEditandoIndex !== null) {
      this.editorImagenAbierto = true;
    }
    this.normalizarOrdenImagenes();
  }

  moverImagen(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= this.imagenesArray.length) {
      return;
    }

    const control = this.imagenesArray;
    const moving = control.at(index);
    control.removeAt(index);
    control.insert(target, moving);
    this.normalizarOrdenImagenes();
  }

  setImagenActiva(index: number) {
    this.imagenesArray.controls.forEach((control, currentIndex) => {
      control.get('activa')?.setValue(currentIndex === index, { emitEvent: false });
    });
    this.imagenSeleccionadaIndex = index;
  }

  async marcarImagenEditandoComoPrincipal(): Promise<void> {
    if (this.imagenEditandoIndex === null) {
      return;
    }

    this.setImagenActiva(this.imagenEditandoIndex);
    await this.guardarImagenes();
  }

  seleccionarImagenPrincipalDesdeGestor(image: FolderImageManagerImage) {
    const index = (this.imagenesArray.controls as any[]).findIndex(
      (control) =>
        this.parseNumber(control.get('id')?.value) === this.parseNumber(image.id)
        || this.limpiarTexto(control.get('draft_key')?.value) === (image.draftKey ?? String(image.id))
    );
    if (!Number.isFinite(index)) {
      return;
    }

    this.imagenSeleccionadaIndex = index;
  }

  editarImagenDesdeGestor(image: FolderImageManagerImage): void {
    const index = (this.imagenesArray.controls as any[]).findIndex(
      (control) =>
        this.parseNumber(control.get('id')?.value) === this.parseNumber(image.id)
        || this.limpiarTexto(control.get('draft_key')?.value) === (image.draftKey ?? String(image.id))
    );
    if (!Number.isFinite(index)) {
      return;
    }

    this.abrirEditorImagen(index);
  }

  async marcarImagenComoPrincipalDesdeGestor(image: FolderImageManagerImage): Promise<void> {
    const index = (this.imagenesArray.controls as any[]).findIndex(
      (control) =>
        this.parseNumber(control.get('id')?.value) === this.parseNumber(image.id)
        || this.limpiarTexto(control.get('draft_key')?.value) === (image.draftKey ?? String(image.id))
    );
    if (!Number.isFinite(index)) {
      return;
    }

    this.imagenSeleccionadaIndex = index;
    this.setImagenActiva(index);
    await this.guardarImagenes();
  }

  cerrarEditorImagen() {
    this.editorImagenAbierto = false;
    this.imagenEditandoIndex = null;
    this.cerrarModalMoverImagen();
    this.setModalLocked(false);
  }

  abrirModalMoverImagen(): void {
    if (!this.imagenEditandoControl || this.imagenEditandoId === null) {
      this.error = 'Guarda la imagen primero para poder moverla.';
      return;
    }

    const carpetaActualId = this.carpetaEditandoSeleccionadaId;
    const carpetasDestino = this.carpetasParaSelector.filter((carpeta) => carpeta.id !== carpetaActualId);
    if (!carpetasDestino.length) {
      this.error = 'Crea otra carpeta primero para poder mover esta imagen.';
      return;
    }

    this.carpetaDestinoMoverImagenId = carpetasDestino[0]?.id ?? null;
    this.mostrarModalMoverImagen = true;
  }

  cerrarModalMoverImagen(): void {
    this.mostrarModalMoverImagen = false;
    this.carpetaDestinoMoverImagenId = null;
  }

  async confirmarMoverImagen(): Promise<void> {
    const draftKey = this.getImagenEditandoDraftKey();
    if (!draftKey) {
      this.error = 'No se pudo identificar la imagen seleccionada.';
      return;
    }

    const carpetaDestinoId = this.carpetaDestinoMoverImagenId;
    if (carpetaDestinoId === null) {
      this.error = 'Selecciona una carpeta destino.';
      return;
    }

    const carpetaActualId = this.carpetaEditandoSeleccionadaId;
    if (carpetaActualId !== null && carpetaActualId === carpetaDestinoId) {
      this.error = 'La carpeta destino debe ser diferente.';
      return;
    }

    const carpetaDestinoNombre = this.normalizarCarpeta(
      this.carpetasActividad.find((item) => Number(item.id) === carpetaDestinoId)?.nombre ?? ''
    );

    this.establecerCarpetaPendiente(draftKey, carpetaDestinoId, carpetaDestinoNombre);
    this.cerrarModalMoverImagen();
  }

  async guardarImagenEditando(): Promise<void> {
    const guardadoOk = await this.guardarImagenes();
    if (guardadoOk) {
      this.cerrarEditorImagen();
    }
  }

  async eliminarImagenEditando(): Promise<void> {
    if (this.imagenEditandoIndex === null) {
      return;
    }

    await this.eliminarImagen(this.imagenEditandoIndex);
  }

  async guardar(): Promise<void> {
    return this.guardarTraducciones();
  }

  async guardarTraducciones(): Promise<void> {
    if (this.guardandoTraducciones || this.guardandoImagenes || this.traduciendoActividad) {
      return;
    }

    const traduccionesControl = this.traduccionesArray;
    if (traduccionesControl.invalid) {
      traduccionesControl.markAllAsTouched();
      return;
    }

    await this.traducirActividadDesdeEspanol();

    const raw = this.form.getRawValue();
    const traducciones = (raw.traducciones ?? []).map((item: any) => ({
      idioma_id: Number(item.idioma_id),
      nombre: this.limpiarTexto(item.nombre),
      descripcion: this.limpiarTexto(item.descripcion)
    }));

    this.guardandoTraducciones = true;
    this.error = '';

    try {
      await this.supabase.guardarTraduccionesActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        traducciones
      });

      this.concentradoTraduccionesActividad = this.idiomas.reduce((acc, idioma) => {
        const traduccion = (raw.traducciones ?? []).find((item: any) => Number(item.idioma_id) === idioma.id);
        acc[idioma.codigo] = {
          nombre: this.limpiarTexto(traduccion?.nombre) ?? '',
          descripcion: this.limpiarTexto(traduccion?.descripcion) ?? ''
        };
        return acc;
      }, {} as Record<string, { nombre: string; descripcion: string }>);
      this.ultimaLlaveTraduccionActividad = this.obtenerLlaveTraduccionEspanol();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron guardar las traducciones.';
    } finally {
      this.guardandoTraducciones = false;
    }
  }

  async guardarImagenes(): Promise<boolean> {
    if (this.guardandoImagenes || this.guardandoTraducciones || this.traduciendoActividad) {
      return false;
    }

    if (this.imagenesArray.invalid) {
      this.imagenesArray.markAllAsTouched();
      return false;
    }

    const raw = this.form.getRawValue();
    const imagenesConPendientes = this.aplicarPendientesImagenes(raw.imagenes ?? []);
    const imagenes = this.normalizarImagenesActividadPayload(imagenesConPendientes).map(({ draft_key, ...imagen }) => imagen);
    const imagenPrincipal = this.obtenerImagenPrincipalGaleria(imagenes);
    const imagenActiva = imagenes.find((imagen) => imagen.activa) ?? null;
    const imagenActivaId = imagenActiva?.id ?? null;

    if (!imagenes.length) {
      this.error = 'Agrega al menos una imagen.';
      return false;
    }

    this.guardandoImagenes = true;
    this.error = '';

    try {
      console.log('[Editar actividad destino] Imagen seleccionada para activar:', {
        actividad_id: this.actividadId,
        imagen_activa_id: imagenActivaId,
        imagen_activa_url: imagenActiva?.imagen_url ?? null,
        imagen_activa_carpeta: imagenActiva?.carpeta ?? imagenActiva?.carpeta_nombre ?? null,
        imagenes: imagenes.map((imagen) => ({
          id: imagen.id,
          activa: imagen.activa,
          carpeta: imagen.carpeta ?? imagen.carpeta_nombre,
          imagen_url: imagen.imagen_url
        }))
      });

      await this.supabase.guardarImagenesActividadAdmin({
        destino_id: this.destinoId,
        actividad_id: this.actividadId,
        imagen_fondo: imagenPrincipal,
        imagen_activa_id: imagenActivaId,
        imagenes: imagenesConPendientes
      });

      this.aplicarPendientesImagenesAlFormulario();
      this.pendientesImagenesCarpeta.clear();
      return true;
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudieron guardar las imagenes.';
      return false;
    } finally {
      this.guardandoImagenes = false;
    }
  }

  getNombreIdioma(codigo: string): string {
    return this.idiomasConfig.find((item) => item.code === codigo)?.label ?? codigo.toUpperCase();
  }

  getTraduccionIdioma(codigo: string): { nombre: string; descripcion: string } | null {
    return this.concentradoTraduccionesActividad?.[codigo] ?? null;
  }

  async onActividadEsBlurOEnter(codigoIdioma: string, event?: Event): Promise<void> {
    if (codigoIdioma !== 'es') {
      return;
    }

    if (event instanceof KeyboardEvent && event.key === 'Enter') {
      event.preventDefault();
    }

    if (this.traduciendoActividad || this.guardandoImagenes || this.guardandoTraducciones) {
      return;
    }

    const raw = this.form.getRawValue();
    const esNombre = this.limpiarTexto(raw?.traducciones?.[this.indiceIdiomaEspanol]?.nombre ?? raw?.traducciones?.es?.nombre);
    const esDescripcion = this.limpiarTexto(raw?.traducciones?.[this.indiceIdiomaEspanol]?.descripcion ?? raw?.traducciones?.es?.descripcion);
    if (!esNombre || !esDescripcion) {
      return;
    }

    this.traduciendoActividad = true;
    this.error = '';

    try {
      await this.traducirActividadDesdeEspanol();
    } catch (error: any) {
      this.error = error?.message ?? 'No se pudo traducir la actividad.';
    } finally {
      this.traduciendoActividad = false;
    }
  }

  private buildImagenesFormArray(imagenes: any[] = []) {
    const carpetaDefault = this.obtenerCarpetaDefaultActividad();
    return this.fb.array(
      imagenes.map((imagen, index) =>
        this.fb.group({
          draft_key: [this.generarClaveImagenBorrador()],
          id: [this.parseNumber(imagen?.id)],
          imagen_url: [imagen?.imagen_url ?? '', [Validators.required]],
          carpeta_id: [this.parseNumber(imagen?.carpeta_id) ?? carpetaDefault?.id ?? null],
          carpeta_nombre: [this.normalizarCarpeta(imagen?.carpeta_nombre ?? imagen?.carpeta ?? carpetaDefault?.nombre ?? '')],
          carpeta: [this.normalizarCarpeta(imagen?.carpeta_nombre ?? imagen?.carpeta ?? carpetaDefault?.nombre ?? '')],
          nombre: [this.limpiarTexto(imagen?.nombre) ?? this.obtenerNombreArchivoDesdeUrl(imagen?.imagen_url ?? '')],
          extension: [this.limpiarTexto(imagen?.extension) ?? this.obtenerExtensionArchivo(imagen?.imagen_url ?? '')],
          mime_type: [this.limpiarTexto(imagen?.mime_type ?? imagen?.mimeType)],
          size: [this.parseNumber(imagen?.size)],
          size_formatted: [
            this.limpiarTexto(imagen?.size_formatted ?? imagen?.sizeFormatted)
            ?? this.formatearTamanoArchivo(this.parseNumber(imagen?.size))
          ],
          activa: [Boolean(imagen?.activa)],
          orden: [Number.isFinite(Number(imagen?.orden)) ? Number(imagen.orden) : index + 1],
          vigencia_desde: [this.parseDateValue(imagen?.vigencia_desde)],
          vigencia_hasta: [this.parseDateValue(imagen?.vigencia_hasta)],
          created_at: [imagen?.created_at ?? null]
        })
      )
    );
  }

  private normalizarImagenesActividadPayload(imagenes: Array<any> = []): ImagenActividadForm[] {
    const carpetaDefault = this.obtenerCarpetaDefaultActividad();
    return (imagenes ?? [])
      .map((imagen, index) => ({
        draft_key: this.limpiarTexto(imagen?.draft_key) ?? this.generarClaveImagenBorrador(),
        id: this.parseNumber(imagen?.id),
        imagen_url: this.limpiarTexto(imagen?.imagen_url) ?? '',
        carpeta_id: this.parseNumber(imagen?.carpeta_id) ?? carpetaDefault?.id ?? null,
        carpeta_nombre: this.normalizarCarpeta(imagen?.carpeta_nombre ?? imagen?.carpeta ?? carpetaDefault?.nombre ?? ''),
        carpeta: this.normalizarCarpeta(imagen?.carpeta_nombre ?? imagen?.carpeta ?? carpetaDefault?.nombre ?? ''),
        nombre: this.limpiarTexto(imagen?.nombre) ?? this.obtenerNombreArchivoDesdeUrl(imagen?.imagen_url ?? ''),
        extension: this.limpiarTexto(imagen?.extension) ?? this.obtenerExtensionArchivo(imagen?.imagen_url ?? ''),
        mime_type: this.limpiarTexto(imagen?.mime_type ?? imagen?.mimeType),
        size: this.parseNumber(imagen?.size),
        size_formatted:
          this.limpiarTexto(imagen?.size_formatted ?? imagen?.sizeFormatted)
          ?? this.formatearTamanoArchivo(this.parseNumber(imagen?.size)),
        activa: Boolean(imagen?.activa),
        orden: this.parseNumber(imagen?.orden) ?? index + 1,
        vigencia_desde: this.normalizarFechaYYYYMMDD(imagen?.vigencia_desde),
        vigencia_hasta: this.normalizarFechaYYYYMMDD(imagen?.vigencia_hasta),
        created_at: imagen?.created_at ?? null
      }))
      .filter((imagen) => !!imagen.imagen_url);
  }

  private aplicarPendientesImagenes(imagenes: Array<any> = []): Array<any> {
    return (imagenes ?? []).map((imagen) => {
      const draftKey = this.limpiarTexto(imagen?.draft_key);
      const pendiente = draftKey ? this.pendientesImagenesCarpeta.get(draftKey) : null;
      if (!pendiente) {
        return imagen;
      }

      return {
        ...imagen,
        carpeta_id: pendiente.carpeta_id,
        carpeta_nombre: pendiente.carpeta_nombre,
        carpeta: pendiente.carpeta
      };
    });
  }

  private aplicarPendientesImagenesAlFormulario(): void {
    (this.imagenesArray.controls as any[]).forEach((control) => {
      const draftKey = this.limpiarTexto(control.get('draft_key')?.value);
      if (!draftKey) {
        return;
      }

      const pendiente = this.pendientesImagenesCarpeta.get(draftKey);
      if (!pendiente) {
        return;
      }

      control.patchValue(
        {
          carpeta_id: pendiente.carpeta_id,
          carpeta_nombre: pendiente.carpeta_nombre,
          carpeta: pendiente.carpeta
        },
        { emitEvent: false }
      );
    });
  }

  private establecerCarpetaPendiente(draftKey: string, carpetaId: number | null, carpetaNombre: string): void {
    const nombreNormalizado = this.normalizarCarpeta(carpetaNombre);
    this.pendientesImagenesCarpeta.set(draftKey, {
      carpeta_id: carpetaId,
      carpeta_nombre: nombreNormalizado,
      carpeta: nombreNormalizado
    });
  }

  private getImagenEditandoDraftKey(): string | null {
    if (this.imagenEditandoIndex === null) {
      return null;
    }

    return this.limpiarTexto(this.imagenesArray.at(this.imagenEditandoIndex)?.get('draft_key')?.value);
  }

  private generarClaveImagenBorrador(): string {
    this.imagenesClaveSecuencia += 1;
    return `imagen-${Date.now()}-${this.imagenesClaveSecuencia}`;
  }

  private obtenerImagenPrincipalGaleria(
    imagenes: Array<{
      id: number | null;
      imagen_url: string;
      carpeta_id: number | null;
      carpeta_nombre: string | null;
      carpeta: string | null;
      activa: boolean;
      orden: number | null;
      vigencia_desde: string | Date | null;
      vigencia_hasta: string | Date | null;
      created_at: string | null;
    }>
  ): string {
    const ordenadas = [...imagenes].sort((a, b) => {
      const ordenA = Number(a.orden ?? Number.MAX_SAFE_INTEGER);
      const ordenB = Number(b.orden ?? Number.MAX_SAFE_INTEGER);
      if (ordenA !== ordenB) return ordenA - ordenB;
      return Number(a.id ?? 0) - Number(b.id ?? 0);
    });
    const hoy = this.obtenerFechaMexicoHoy();
    const vigentes = ordenadas.filter((imagen) => this.imagenEstaVigente(imagen, hoy));
    const candidataVigente = vigentes.find((imagen) => imagen.activa) ?? vigentes[0] ?? null;
    const candidataActiva = ordenadas.find((imagen) => imagen.activa) ?? null;
    const candidataOrden = ordenadas[0] ?? null;

    return candidataVigente?.imagen_url ?? candidataActiva?.imagen_url ?? candidataOrden?.imagen_url ?? '';
  }

  private obtenerFechaMexicoHoy(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  private imagenEstaVigente(imagen: { vigencia_desde?: string | Date | null; vigencia_hasta?: string | Date | null }, fechaReferencia: string): boolean {
    const desde = this.normalizarFechaYYYYMMDD(imagen?.vigencia_desde);
    const hasta = this.normalizarFechaYYYYMMDD(imagen?.vigencia_hasta);

    if (!desde && !hasta) return false;
    if (desde && fechaReferencia < desde) return false;
    if (hasta && fechaReferencia > hasta) return false;
    return true;
  }

  private normalizarFechaYYYYMMDD(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const texto = String(value).trim();
    return texto ? texto.slice(0, 10) : null;
  }

  private parseDateValue(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const texto = String(value).trim();
    if (!texto) return null;

    const [year, month, day] = texto.slice(0, 10).split('-').map((part) => Number(part));
    if (![year, month, day].every((part) => Number.isFinite(part))) {
      return null;
    }

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizarCarpeta(valor: string | number | null | undefined): string {
    const carpeta = String(valor ?? '').trim();
    if (!carpeta.length) {
      return '';
    }

    return carpeta.charAt(0).toUpperCase() + carpeta.slice(1);
  }

  private obtenerCarpetaDefaultActividad(): { id: number; nombre: string } | null {
    const carpeta = [...this.carpetasActividad]
      .map((item) => ({
        id: Number(item.id),
        nombre: this.normalizarCarpeta(item.nombre),
        orden: Number(item.orden ?? Number.MAX_SAFE_INTEGER)
      }))
      .filter((item) => Number.isFinite(item.id) && !!item.nombre && item.nombre !== 'Sin carpeta')
      .sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre))[0];

    return carpeta ? { id: carpeta.id, nombre: carpeta.nombre } : null;
  }

  private obtenerCarpetaPorNombre(nombre: string): { id: number; nombre: string } | null {
    const nombreNormalizado = this.normalizarCarpeta(nombre).toLowerCase();
    const carpeta = this.carpetasActividad.find(
      (item) => this.normalizarCarpeta(item.nombre).toLowerCase() === nombreNormalizado
    );

    if (!carpeta) {
      return null;
    }

    return {
      id: Number(carpeta.id),
      nombre: this.normalizarCarpeta(carpeta.nombre)
    };
  }

  private asegurarCarpetaLocalDraft(
    nombre: string,
    agregarSiNoExiste = true
  ): { id: number; nombre: string } | null {
    const nombreNormalizado = this.normalizarCarpeta(nombre);
    if (!nombreNormalizado) {
      return null;
    }

    const existente = this.obtenerCarpetaPorNombre(nombreNormalizado);
    if (existente) {
      return existente;
    }

    if (!agregarSiNoExiste) {
      return null;
    }

    const nuevaCarpeta = {
      id: this.carpetasTemporalesSecuencia,
      nombre: nombreNormalizado,
      orden: (this.carpetasActividad.reduce((max, item) => Math.max(max, Number(item.orden ?? 0)), 0) || 0) + 1,
      created_at: null,
      updated_at: null
    };

    this.carpetasTemporalesSecuencia -= 1;
    this.carpetasActividad = [...this.carpetasActividad, nuevaCarpeta];

    return {
      id: Number(nuevaCarpeta.id),
      nombre: nuevaCarpeta.nombre
    };
  }

  private async traducirActividadDesdeEspanol(): Promise<void> {
    const indexEs = this.indiceIdiomaEspanol;
    if (indexEs < 0) {
      return;
    }

    const esControl = this.traduccionesArray.at(indexEs);
    if (!esControl) {
      return;
    }

    const esNombre = this.limpiarTexto(esControl.get('nombre')?.value);
    const esDescripcion = this.limpiarTexto(esControl.get('descripcion')?.value);

    if (!esNombre || !esDescripcion) {
      return;
    }

    const llaveActual = `${esNombre}|${esDescripcion}`;
    if (
      llaveActual === this.ultimaLlaveTraduccionActividad &&
      Object.keys(this.concentradoTraduccionesActividad).length > 0
    ) {
      return;
    }

    const traduccionesExistentes = { ...this.concentradoTraduccionesActividad };
    const idiomasCompletos = this.idiomas.every((idioma) => {
      if (idioma.codigo === 'es') {
        return true;
      }

      const traduccionExistente = traduccionesExistentes?.[idioma.codigo];
      return Boolean(traduccionExistente?.nombre || traduccionExistente?.descripcion);
    });

    if (idiomasCompletos && llaveActual === this.ultimaLlaveTraduccionActividad) {
      return;
    }

    const traducciones = await this.supabase.traducirDesdeEspanol({
      title: esNombre,
      description: esDescripcion
    });

    if (!traducciones || typeof traducciones !== 'object') {
      return;
    }

    const concentrado = this.idiomas.reduce((acc, idioma) => {
      const traduccionIdioma = traducciones?.[idioma.codigo];
      if (!traduccionIdioma) {
        return acc;
      }

      acc[idioma.codigo] = {
        nombre: typeof traduccionIdioma.title === 'string' ? traduccionIdioma.title : '',
        descripcion:
          typeof traduccionIdioma.description === 'string' ? traduccionIdioma.description : ''
      };

      return acc;
    }, {} as Record<string, { nombre: string; descripcion: string }>);

    this.concentradoTraduccionesActividad = concentrado;

    this.idiomas.forEach((idioma) => {
      const traduccionIdioma = concentrado?.[idioma.codigo];
      if (!traduccionIdioma) {
        return;
      }

      const index = this.traduccionesArray.controls.findIndex((control) => control.get('codigo')?.value === idioma.codigo);
      if (index < 0) {
        return;
      }

      this.traduccionesArray.at(index).get('nombre')?.setValue(traduccionIdioma.nombre);
      this.traduccionesArray.at(index).get('descripcion')?.setValue(traduccionIdioma.descripcion);
    });

    this.ultimaLlaveTraduccionActividad = llaveActual;
  }

  private construirConcentradoTraduccionesDesdeActividad(
    actividad: any
  ): Record<string, { nombre: string; descripcion: string }> {
    return this.idiomas.reduce((acc, idioma) => {
      const traduccion = actividad?.traducciones?.[idioma.id];
      acc[idioma.codigo] = {
        nombre: this.limpiarTexto(traduccion?.nombre) ?? '',
        descripcion: this.limpiarTexto(traduccion?.descripcion) ?? ''
      };
      return acc;
    }, {} as Record<string, { nombre: string; descripcion: string }>);
  }

  private obtenerLlaveTraduccionEspanol(): string {
    const indexEs = this.indiceIdiomaEspanol;
    const esControl = indexEs >= 0 ? this.traduccionesArray.at(indexEs) : null;
    const esNombre = this.limpiarTexto(esControl?.get('nombre')?.value);
    const esDescripcion = this.limpiarTexto(esControl?.get('descripcion')?.value);
    return `${esNombre ?? ''}|${esDescripcion ?? ''}`;
  }

  private limpiarTexto(value: string | null | undefined): string | null {
    const limpio = (value ?? '').trim();
    return limpio ? limpio : null;
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private ordenarIdiomas(idiomas: IIdiomaPreviewAdmin[]): IIdiomaPreviewAdmin[] {
    const mapByCode = new Map(idiomas.map((item) => [item.codigo, item]));
    return this.idiomasConfig
      .map((config) => mapByCode.get(config.code))
      .filter((item): item is IIdiomaPreviewAdmin => !!item);
  }

  private obtenerNombreActividad(actividad: any, preview: IPreviewDestinoAdmin): string {
    const es = this.idiomas.find((idioma) => idioma.codigo === 'es');
    if (es) {
      const traduccion = actividad?.traducciones?.[es.id];
      if (traduccion?.nombre) {
        return traduccion.nombre;
      }
    }

    const fallback = preview.actividades?.find((item) => Number(item.id) === this.actividadId);
    return fallback?.traducciones?.[es?.id ?? 1]?.nombre ?? 'Actividad';
  }

  private normalizarOrdenImagenes() {
    this.imagenesArray.controls.forEach((control, index) => {
      control.get('orden')?.setValue(index + 1, { emitEvent: false });
    });

    if (!this.imagenesArray.controls.some((control) => Boolean(control.get('activa')?.value)) && this.imagenesArray.length > 0) {
      this.imagenesArray.at(0)?.get('activa')?.setValue(true, { emitEvent: false });
    }
  }

  private abrirEditorImagen(index: number) {
    if (index < 0 || index >= this.imagenesArray.length) {
      return;
    }

    this.imagenSeleccionadaIndex = index;
    this.imagenEditandoIndex = index;
    this.editorImagenAbierto = true;
    this.setModalLocked(true);
  }

  private obtenerNombreImagen(imageUrl: string, index: number): string {
    try {
      const pathname = new URL(imageUrl).pathname;
      const nombre = pathname.split('/').pop()?.trim();
      return nombre || `Imagen ${index + 1}`;
    } catch {
      return `Imagen ${index + 1}`;
    }
  }

  private obtenerNombreArchivoDesdeUrl(imageUrl: string): string | null {
    try {
      const pathname = new URL(imageUrl).pathname;
      const nombre = pathname.split('/').pop()?.trim();
      return nombre || null;
    } catch {
      return null;
    }
  }

  private obtenerExtensionArchivo(imageUrl: string): string | null {
    const nombre = this.obtenerNombreArchivoDesdeUrl(imageUrl);
    const match = nombre?.match(/\.([a-zA-Z0-9]{2,12})$/);
    return match?.[1]?.toLowerCase() ?? null;
  }

  private construirClavesIdentidadImagen(input: {
    url?: string | null | undefined;
    nombre?: string | null | undefined;
    size?: number | string | null | undefined;
  }): string[] {
    const claves = new Set<string>();
    const urlNormalizada = this.normalizarUrlImagen(input.url);
    const driveFileId = this.extraerDriveFileId(input.url);
    const nombreArchivo = this.normalizarNombreArchivoComparacion(
      input.nombre ?? this.obtenerNombreArchivoDesdeUrl(input.url ?? '')
    );
    const size = this.parseNumber(input.size);

    if (urlNormalizada) {
      claves.add(`url:${urlNormalizada}`);
    }

    if (driveFileId) {
      claves.add(`drive:${driveFileId}`);
    }

    if (nombreArchivo) {
      claves.add(`file:${nombreArchivo}`);
    }

    if (nombreArchivo && size !== null) {
      claves.add(`file-size:${nombreArchivo}:${size}`);
    }

    return Array.from(claves);
  }

  private normalizarUrlImagen(value: string | null | undefined): string | null {
    const limpio = this.limpiarTexto(value);
    if (!limpio) {
      return null;
    }

    try {
      const url = new URL(limpio);
      url.hash = '';
      url.searchParams.sort();
      return url.toString().replace(/\/$/, '').toLowerCase();
    } catch {
      return limpio.toLowerCase().replace(/\/$/, '');
    }
  }

  private extraerDriveFileId(value: string | null | undefined): string | null {
    const limpio = this.limpiarTexto(value);
    if (!limpio) {
      return null;
    }

    const patrones = [
      /\/d\/([a-zA-Z0-9_-]{10,})/,
      /[?&]id=([a-zA-Z0-9_-]{10,})/,
      /\/folders\/([a-zA-Z0-9_-]{10,})/
    ];

    for (const patron of patrones) {
      const match = limpio.match(patron);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  }

  private normalizarNombreArchivoComparacion(value: string | null | undefined): string | null {
    const limpio = this.limpiarTexto(value);
    if (!limpio) {
      return null;
    }

    try {
      return decodeURIComponent(limpio).trim().toLowerCase();
    } catch {
      return limpio.trim().toLowerCase();
    }
  }

  private formatearTamanoArchivo(size: number | null): string | null {
    if (size === null || !Number.isFinite(size) || size < 0) {
      return null;
    }

    if (size < 1024) {
      return `${size} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = size / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  private slugify(value: string | number): string {
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sin-carpeta';
  }

  private setModalLocked(bloquear: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('modal-locked', bloquear);
  }
}
