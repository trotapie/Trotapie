import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { getDefaultLang } from 'app/lang.utils';
import { TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { ISolicitudCotizacionListado } from 'app/interface/solicitudes-cotizacion.interface';
import { construirNombreClienteVisible } from './cliente-nombre.util';

const ES_ID = 1;
const CODIGOS_IDIOMA_PREVIEW = ['es', 'en', 'pt', 'de', 'fr'] as const;

export interface IIdiomaPreviewAdmin {
  id: number;
  codigo: string;
  nombre: string;
}

export interface IDriveActividadImportImage {
  publicImageUrl: string;
  nombre?: string | null;
  extension?: string | null;
  mimeType?: string | null;
  size?: number | null;
  sizeFormatted?: string | null;
}

export interface IDriveActividadImportFolder {
  id: string;
  nombre: string;
  imagenes: IDriveActividadImportImage[];
}

export interface ITraduccionPreviewAdmin {
  idioma_id: number;
  nombre: string;
  apodo: string;
  descripcion_corta: string;
  descripcion_larga: string;
  titulo_descripcion: string;
}

export interface IDetalleRapidoPreviewAdmin {
  id: number;
  tipo_dato_rapido_id: number;
  clave: string;
  nombre: string;
  icono: string | null;
  tipo_valor: string | null;
  orden: number | null;
  valores: Record<number, string>;
}

export interface IActividadPreviewAdmin {
  id: number | null;
  imagen_fondo: string;
  icono?: string | null;
  imagen_fondo_id?: number | null;
  imagen_seleccionada?: string;
  imagen_seleccionada_id?: number | null;
  carpetas?: Array<{
    id: number;
    nombre: string;
    orden: number | null;
    created_at: string | null;
    updated_at: string | null;
  }>;
  imagenes?: Array<{
    id: number;
    imagen_url: string;
    carpeta_id?: number | null;
    carpeta_nombre?: string | null;
    carpeta?: string | null;
    nombre?: string | null;
    extension?: string | null;
    mime_type?: string | null;
    size?: number | null;
    size_formatted?: string | null;
    activa: boolean;
    orden: number | null;
    vigencia_desde: string | null;
    vigencia_hasta: string | null;
    created_at: string | null;
  }>;
  traducciones: Record<number, { nombre: string; descripcion: string }>;
}

export interface IPreviewDestinoAdmin {
  detalles_destinos_id: number | null;
  destino_id: number;
  destino_nombre: string;
  ubicacion: string;
  idiomas: IIdiomaPreviewAdmin[];
  traducciones: ITraduccionPreviewAdmin[];
  detalles_rapidos: IDetalleRapidoPreviewAdmin[];
  actividades: IActividadPreviewAdmin[];
  catalogo_tipos_dato_rapido: Array<{
    id: number;
    clave: string;
    nombre: string;
    icono: string | null;
    tipo_valor: string | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly traduccionEndpoint =
    'https://script.google.com/macros/s/AKfycbwJ64gxjQiSsfZzixzr0tIe1na6tM81oAAW9Cjt8uuI53DDSaaAn_UMl2zgU69ZYyg3/exec';
  private readonly driveActividadImagenesEndpoint =
    'https://script.google.com/macros/s/AKfycbyJwRo6g4aDbB2Va0739BAMzF2QCUcMu1t4ss9cG2GsbbGC3cK_wpnfD_pOD6x3PTlm/exec';
  private client: SupabaseClient;
  private transloco = inject(TranslocoService);

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: {
        fetch: (url, init) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30_000);
          return fetch(url, { ...init, signal: controller.signal })
            .finally(() => clearTimeout(timeoutId));
        },
      },
    });
  }

  // ✅ agrega esto dentro de SupabaseService
  getClient(): SupabaseClient {
    return this.client;
  }

  private obtenerFechaMexicoHoy(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  private normalizarFecha(valor?: string | null): string | null {
    const fecha = String(valor ?? '').trim();
    return fecha.length ? fecha.slice(0, 10) : null;
  }

  private normalizarNombreCarpeta(valor?: string | null): string {
    const nombre = String(valor ?? '').trim();
    if (!nombre.length) {
      return 'Sin carpeta';
    }

    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  }

  private claveCarpeta(valor?: string | null): string {
    return this.normalizarNombreCarpeta(valor).toLowerCase();
  }

  private parseNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private parseBigint(value: number | string | null | undefined): number | null {
    const numberValue = this.parseNumber(value);
    if (numberValue === null) {
      return null;
    }

    return Math.trunc(numberValue);
  }

  private extraerIdCarpetaDrive(value: string): string {
    const limpio = String(value ?? '').trim();
    if (!limpio) {
      return '';
    }

    const matchFolders = limpio.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (matchFolders?.[1]) {
      return matchFolders[1];
    }

    const matchIdDirecto = limpio.match(/^[a-zA-Z0-9_-]{10,}$/);
    return matchIdDirecto ? limpio : '';
  }

  private extraerUrlDriveImagen(value: any): string | null {
    if (typeof value === 'string') {
      const url = value.trim();
      return /^https?:\/\//i.test(url) ? url : null;
    }

    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidates = [
      value.publicImageUrl,
      value.public_image_url,
      value.publicViewUrl,
      value.public_view_url,
      value.url,
      value.imagen_url,
      value.imageUrl,
      value.src,
      value.downloadUrl,
      value.webViewLink,
      value.webContentLink
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
        return candidate.trim();
      }
    }

    return null;
  }

  private derivarExtensionImagen(nombre?: string | null, imagenUrl?: string | null): string | null {
    const candidatos = [String(nombre ?? '').trim(), String(imagenUrl ?? '').trim()];

    for (const candidato of candidatos) {
      if (!candidato) {
        continue;
      }

      const limpio = candidato.split('?')[0].split('#')[0];
      const match = limpio.match(/\.([a-zA-Z0-9]{2,12})$/);
      if (match?.[1]) {
        return match[1].toLowerCase();
      }
    }

    return null;
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

  private normalizarImagenDrive(value: any): IDriveActividadImportImage | null {
    const publicImageUrl = this.extraerUrlDriveImagen(value);
    if (!publicImageUrl) {
      return null;
    }

    const nombre =
      typeof value === 'object' && value !== null
        ? String(value.nombre ?? value.name ?? value.fileName ?? value.filename ?? value.title ?? '').trim() || null
        : null;
    const extension =
      typeof value === 'object' && value !== null
        ? String(value.extension ?? value.ext ?? '').trim().toLowerCase() || this.derivarExtensionImagen(nombre, publicImageUrl)
        : this.derivarExtensionImagen(nombre, publicImageUrl);
    const mimeType =
      typeof value === 'object' && value !== null
        ? String(value.mimeType ?? value.mime_type ?? value.type ?? '').trim() || null
        : null;
    const size =
      typeof value === 'object' && value !== null
        ? this.parseBigint(value.size ?? value.fileSize ?? value.bytes)
        : null;
    const sizeFormatted =
      typeof value === 'object' && value !== null
        ? String(value.sizeFormatted ?? value.size_formatted ?? '').trim() || this.formatearTamanoArchivo(size)
        : this.formatearTamanoArchivo(size);

    return {
      publicImageUrl,
      nombre,
      extension,
      mimeType,
      size,
      sizeFormatted
    };
  }

  private recolectarImagenesDrive(node: any): IDriveActividadImportImage[] {
    if (!node) {
      return [];
    }

    if (Array.isArray(node)) {
      const seen = new Set<string>();
      return node
        .flatMap((item) => this.recolectarImagenesDrive(item))
        .filter((imagen) => {
          const key = imagen.publicImageUrl;
          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        });
    }

    const directa = this.normalizarImagenDrive(node);
    if (directa) {
      return [directa];
    }

    if (typeof node === 'object') {
      const colecciones = [
        node.imagenes,
        node.images,
        node.urls,
        node.archivos,
        node.files,
        node.data
      ].filter((item) => item !== undefined);

      if (colecciones.length) {
        const seen = new Set<string>();
        return colecciones
          .flatMap((item) => this.recolectarImagenesDrive(item))
          .filter((imagen) => {
            const key = imagen.publicImageUrl;
            if (seen.has(key)) {
              return false;
            }

            seen.add(key);
            return true;
          });
      }
    }

    return [];
  }

  private normalizarCarpetasDriveActividad(result: any): IDriveActividadImportFolder[] {
    const folders: IDriveActividadImportFolder[] = [];
    const pushFolder = (nombreRaw: any, imagenesRaw: any, fallbackId: string) => {
      const imagenes = this.recolectarImagenesDrive(imagenesRaw);
      if (!imagenes.length) {
        return;
      }

      const nombre = String(nombreRaw ?? '').trim() || 'General';
      folders.push({
        id: fallbackId,
        nombre,
        imagenes
      });
    };

    const coleccionesAgrupadas = [
      result?.data?.folders,
      result?.data?.carpetas,
      result?.folders,
      result?.carpetas
    ].find((item) => Array.isArray(item) && item.length);

    if (Array.isArray(coleccionesAgrupadas)) {
      coleccionesAgrupadas.forEach((item: any, index: number) => {
        pushFolder(
          item?.nombre ?? item?.name ?? item?.folderName ?? item?.carpeta ?? item?.title,
          item?.imagenes ?? item?.images ?? item?.urls ?? item?.archivos ?? item?.files ?? item?.data ?? item,
          String(item?.id ?? item?.folderId ?? index)
        );
      });
    }

    if (folders.length) {
      return folders;
    }

    const objetoAgrupado = [result?.data?.folders, result?.data?.carpetas, result?.folders, result?.carpetas]
      .find((item) => item && typeof item === 'object' && !Array.isArray(item));

    if (objetoAgrupado && typeof objetoAgrupado === 'object') {
      Object.entries(objetoAgrupado).forEach(([key, value], index) => {
        pushFolder(key, value, `${key}-${index}`);
      });
    }

    if (folders.length) {
      return folders;
    }

    const imagenesPlanas = this.recolectarImagenesDrive(
      result?.data?.imagenes
      ?? result?.data?.images
      ?? result?.data?.urls
      ?? result?.data
      ?? result?.imagenes
      ?? result?.images
      ?? result?.urls
      ?? result
    );

    if (imagenesPlanas.length) {
      return [{
        id: 'general',
        nombre: 'General',
        imagenes: imagenesPlanas
      }];
    }

    return [];
  }

  async obtenerImagenesActividadDesdeDrive(folderUrlOrId: string): Promise<IDriveActividadImportFolder[]> {
    const folderId = this.extraerIdCarpetaDrive(folderUrlOrId);
    if (!folderId) {
      throw new Error('La URL de Drive no es valida. Verifica que incluya una carpeta.');
    }

    const url = `${this.driveActividadImagenesEndpoint}?folderId=${encodeURIComponent(folderId)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('No se pudo consultar la carpeta de Drive.');
    }

    const result: any = await response.json();
    if (result?.success === false || result?.ok === false) {
      throw new Error(result?.message || 'No se pudieron obtener las imagenes desde Drive.');
    }

    const folders = this.normalizarCarpetasDriveActividad(result);
    if (!folders.length) {
      throw new Error('No se encontraron imagenes en esa carpeta de Drive.');
    }

    return folders;
  }

  private imagenEstaVigente(imagen: {
    vigencia_desde?: string | null;
    vigencia_hasta?: string | null;
  }, fechaReferencia: string): boolean {
    const desde = this.normalizarFecha(imagen?.vigencia_desde);
    const hasta = this.normalizarFecha(imagen?.vigencia_hasta);

    if (!desde && !hasta) {
      return false;
    }

    if (desde && fechaReferencia < desde) {
      return false;
    }

    if (hasta && fechaReferencia > hasta) {
      return false;
    }

    return true;
  }

  private ordenarImagenesGaleria(
    imagenes: Array<{
      id: number;
      imagen_url: string;
      carpeta?: string | null;
      activa?: boolean;
      orden?: number | null;
      vigencia_desde?: string | null;
      vigencia_hasta?: string | null;
      created_at?: string | null;
    }>
  ) {
    return [...(imagenes ?? [])].sort((a: any, b: any) => {
      const ordenA = a?.orden ?? Number.MAX_SAFE_INTEGER;
      const ordenB = b?.orden ?? Number.MAX_SAFE_INTEGER;
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      return Number(a?.id ?? 0) - Number(b?.id ?? 0);
    });
  }

  private seleccionarImagenGaleria(
    imagenes: Array<{
      id: number;
      imagen_url: string;
      carpeta?: string | null;
      activa?: boolean;
      orden?: number | null;
      vigencia_desde?: string | null;
      vigencia_hasta?: string | null;
      created_at?: string | null;
    }>,
    fechaReferencia = this.obtenerFechaMexicoHoy()
  ) {
    const ordenadas = this.ordenarImagenesGaleria(imagenes);
    const vigentes = ordenadas.filter((imagen) => this.imagenEstaVigente(imagen, fechaReferencia));
    const candidataVigente = vigentes.find((imagen) => Boolean(imagen?.activa)) ?? vigentes[0] ?? null;
    const candidataActiva = ordenadas.find((imagen) => Boolean(imagen?.activa)) ?? null;
    const candidataOrden = ordenadas[0] ?? null;

    return candidataVigente ?? candidataActiva ?? candidataOrden;
  }

  private async obtenerCarpetasActividad(actividadId: number) {
    const { data, error } = await this.client
      .from('atracciones_carpetas')
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .eq('atraccion_id', actividadId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  private async asegurarCarpetasActividad(actividadId: number, nombresCarpeta: string[]) {
    const nombresNormalizados = [...new Set(nombresCarpeta.map((valor) => this.normalizarNombreCarpeta(valor)))];
    const carpetasExistentesOriginal = await this.obtenerCarpetasActividad(actividadId);
    const carpetasExistentes: any[] = [];
    const carpetasPorNombre = new Map<string, any>();

    for (const carpeta of carpetasExistentesOriginal) {
      const nombreNormalizado = this.normalizarNombreCarpeta(carpeta.nombre);
      if (carpeta.nombre !== nombreNormalizado) {
        const { error: updateError } = await this.client
          .from('atracciones_carpetas')
          .update({ nombre: nombreNormalizado })
          .eq('id', carpeta.id);

        if (updateError) throw updateError;

        carpeta.nombre = nombreNormalizado;
      }

      carpetasExistentes.push(carpeta);
      carpetasPorNombre.set(this.claveCarpeta(carpeta.nombre), carpeta);
    }

    const faltantes = nombresNormalizados.filter((nombre) => !carpetasPorNombre.has(this.claveCarpeta(nombre)));
    if (faltantes.length) {
      const siguienteOrdenBase = carpetasExistentes.length;
      const inserts = faltantes.map((nombre, index) => ({
        atraccion_id: actividadId,
        nombre: this.normalizarNombreCarpeta(nombre),
        orden: siguienteOrdenBase + index + 1
      }));

      const { data: carpetasInsertadas, error: carpetasInsertadasError } = await this.client
        .from('atracciones_carpetas')
        .upsert(inserts, {
          onConflict: 'atraccion_id,nombre'
        })
        .select('id, atraccion_id, nombre, orden, created_at, updated_at');

      if (carpetasInsertadasError) throw carpetasInsertadasError;

      (carpetasInsertadas ?? []).forEach((carpeta: any) => {
        carpetasPorNombre.set(this.claveCarpeta(carpeta.nombre), carpeta);
      });
    }

    return carpetasPorNombre;
  }

  private async sincronizarImagenesActividad(
    actividadId: number,
    imagenes?: Array<{
      id?: number | null;
      imagen_url: string | null;
      carpeta_id?: number | null;
      carpeta_nombre?: string | null;
      carpeta?: string | null;
      nombre?: string | null;
      extension?: string | null;
      mime_type?: string | null;
      mimeType?: string | null;
      size?: number | null;
      size_formatted?: string | null;
      sizeFormatted?: string | null;
      activa?: boolean;
      orden?: number | null;
      vigencia_desde?: string | null;
      vigencia_hasta?: string | null;
    }>,
    imagenActivaId?: number | null
  ) {
    if (!Array.isArray(imagenes)) {
      return;
    }

    const limpias = imagenes
      .map((imagen, index) => ({
        id: Number.isFinite(Number(imagen?.id)) ? Number(imagen?.id) : null,
        imagen_url: String(imagen?.imagen_url ?? '').trim(),
        carpeta_id: this.parseNumber(imagen?.carpeta_id),
        carpeta_nombre: this.normalizarNombreCarpeta(imagen?.carpeta_nombre ?? imagen?.carpeta),
        carpeta: this.normalizarNombreCarpeta(imagen?.carpeta_nombre ?? imagen?.carpeta),
        nombre: String(imagen?.nombre ?? '').trim() || null,
        extension: String(imagen?.extension ?? '').trim().toLowerCase() || this.derivarExtensionImagen(imagen?.nombre, imagen?.imagen_url),
        mime_type: String(imagen?.mime_type ?? imagen?.mimeType ?? '').trim() || null,
        size: this.parseBigint(imagen?.size),
        size_formatted:
          String(imagen?.size_formatted ?? imagen?.sizeFormatted ?? '').trim()
          || this.formatearTamanoArchivo(this.parseBigint(imagen?.size)),
        activa: Boolean(imagen?.activa),
        orden: Number.isFinite(Number(imagen?.orden)) ? Number(imagen?.orden) : index + 1,
        vigencia_desde: this.normalizarFecha(imagen?.vigencia_desde),
        vigencia_hasta: this.normalizarFecha(imagen?.vigencia_hasta)
      }))
      .filter((imagen) => !!imagen.imagen_url);

    if (!limpias.length) {
      const { error: eliminarImagenesError } = await this.client
        .from('atracciones_imagenes')
        .delete()
        .eq('atraccion_id', actividadId);

      if (eliminarImagenesError) throw eliminarImagenesError;
      return;
    }

    const idActivaRecibida = this.parseNumber(imagenActivaId);
    const indicePorId = idActivaRecibida !== null
      ? limpias.findIndex((imagen) => imagen.id === idActivaRecibida)
      : -1;
    const primeraActiva = limpias.findIndex((imagen) => imagen.activa);
    const indiceActivaFinal = indicePorId >= 0 ? indicePorId : primeraActiva >= 0 ? primeraActiva : 0;
    limpias.forEach((imagen, index) => {
      imagen.activa = index === indiceActivaFinal;
    });

    const carpetasPorNombre = await this.asegurarCarpetasActividad(
      actividadId,
      limpias.map((imagen) => imagen.carpeta_nombre ?? imagen.carpeta)
    );

    const { data: existentes, error: existentesError } = await this.client
      .from('atracciones_imagenes')
      .select('id, activa')
      .eq('atraccion_id', actividadId);

    if (existentesError) throw existentesError;

    const idsExistentes = new Set((existentes ?? []).map((item: any) => Number(item.id)));
    const idImagenActivaActual =
      (existentes ?? []).find((item: any) => Boolean(item.activa))?.id ?? null;
    const idsRecibidos = new Set<number>();
    let idImagenActivaFinal: number | null = null;

    for (let index = 0; index < limpias.length; index += 1) {
      const imagen = limpias[index];
      let carpetaAsignada: any = null;

      if (imagen.carpeta_id !== null) {
        const { data: carpetaPorId, error: carpetaPorIdError } = await this.client
          .from('atracciones_carpetas')
          .select('id, atraccion_id, nombre, orden, created_at, updated_at')
          .eq('id', imagen.carpeta_id)
          .eq('atraccion_id', actividadId)
          .maybeSingle();

        if (carpetaPorIdError) throw carpetaPorIdError;
        carpetaAsignada = carpetaPorId;
      }

      if (!carpetaAsignada?.id) {
        carpetaAsignada = carpetasPorNombre.get(this.claveCarpeta(imagen.carpeta_nombre ?? imagen.carpeta));
      }

      if (!carpetaAsignada?.id) {
        throw new Error(
          `No se pudo resolver la carpeta "${imagen.carpeta_nombre ?? imagen.carpeta}" para la actividad ${actividadId}.`
        );
      }

      if (imagen.id && idsExistentes.has(imagen.id)) {
        idsRecibidos.add(imagen.id);
        const { error: updateError } = await this.client
          .from('atracciones_imagenes')
          .update({
            imagen_url: imagen.imagen_url,
            carpeta_id: carpetaAsignada.id,
            carpeta: carpetaAsignada.nombre,
            nombre: imagen.nombre,
            extension: imagen.extension,
            mime_type: imagen.mime_type,
            size: imagen.size,
            size_formatted: imagen.size_formatted,
            orden: imagen.orden,
            vigencia_desde: imagen.vigencia_desde,
            vigencia_hasta: imagen.vigencia_hasta
          })
          .eq('id', imagen.id)
          .eq('atraccion_id', actividadId);

        if (updateError) throw updateError;
        if (index === indiceActivaFinal) {
          idImagenActivaFinal = imagen.id;
        }
        continue;
      }

      const { data: nuevaImagen, error: insertError } = await this.client
        .from('atracciones_imagenes')
        .insert({
          atraccion_id: actividadId,
          imagen_url: imagen.imagen_url,
          carpeta_id: carpetaAsignada.id,
          carpeta: carpetaAsignada.nombre,
          nombre: imagen.nombre,
          extension: imagen.extension,
          mime_type: imagen.mime_type,
          size: imagen.size,
          size_formatted: imagen.size_formatted,
          activa: false,
          orden: imagen.orden,
          vigencia_desde: imagen.vigencia_desde,
          vigencia_hasta: imagen.vigencia_hasta
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (nuevaImagen?.id) {
        idsRecibidos.add(Number(nuevaImagen.id));
        if (index === indiceActivaFinal) {
          idImagenActivaFinal = Number(nuevaImagen.id);
        }
      }
    }

    const idsParaEliminar = [...idsExistentes].filter((id) => !idsRecibidos.has(id));
    if (idsParaEliminar.length) {
      const { error: eliminarError } = await this.client
        .from('atracciones_imagenes')
        .delete()
        .eq('atraccion_id', actividadId)
        .in('id', idsParaEliminar);

      if (eliminarError) throw eliminarError;
    }

    const imagenActivaFinal = limpias[indiceActivaFinal] ?? null;
    if (idImagenActivaFinal === null && imagenActivaFinal?.imagen_url) {
      const { data: imagenesPorUrl, error: buscarPorUrlError } = await this.client
        .from('atracciones_imagenes')
        .select('id')
        .eq('atraccion_id', actividadId)
        .eq('imagen_url', imagenActivaFinal.imagen_url)
        .limit(1);

      if (buscarPorUrlError) throw buscarPorUrlError;

      const idPorUrl = this.parseNumber(imagenesPorUrl?.[0]?.id);
      if (idPorUrl === null) {
        throw new Error('No se encontro la imagen seleccionada para marcarla como principal.');
      }

      idImagenActivaFinal = idPorUrl;
    }

    const idImagenActivaAnterior = this.parseNumber(idImagenActivaActual);
    if (
      idImagenActivaAnterior !== null &&
      idImagenActivaAnterior !== idImagenActivaFinal &&
      idsRecibidos.has(idImagenActivaAnterior)
    ) {
      const { error: desactivarAnteriorError } = await this.client
        .from('atracciones_imagenes')
        .update({ activa: false })
        .eq('id', idImagenActivaAnterior)
        .eq('atraccion_id', actividadId);

      if (desactivarAnteriorError) throw desactivarAnteriorError;
    }

    if (idImagenActivaFinal !== null && idImagenActivaFinal !== idImagenActivaAnterior) {
      const { error: activarFinalError } = await this.client
        .from('atracciones_imagenes')
        .update({ activa: true })
        .eq('id', idImagenActivaFinal)
        .eq('atraccion_id', actividadId);

      if (activarFinalError) throw activarFinalError;
    }

  }

  // ===== AUTH =====
  getSession() { return this.client.auth.getSession(); }
  onAuth(cb: Parameters<SupabaseClient['auth']['onAuthStateChange']>[0]) {
    return this.client.auth.onAuthStateChange(cb);
  }

  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password }); // v2
  }

  signOut() { return this.client.auth.signOut(); }

  // ===== DB (PostgREST) =====

  async listHotelesAll(destinoId: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);

    const { data, error } = await this.client
      .from('hoteles')
      .select(`
    id, created_at, estrellas, fondo, orden, ubicacion,

    traducciones:hotel_traducciones (
      idioma_id,
      nombre_hotel,
      descripcion
    ),

    descuento:descuento_id (
      id,
      icono,
      traducciones:descuentos_traducciones (
        idioma_id,
        descripcion
      )
    ),

    destinos:destino_id!inner ( id, nombre, tipo_desino_id ),
    concepto:concepto_id ( id, descripcion, icono ),

    regimen:regimen_id (
      id,
      traducciones:regimen_traducciones (
        idioma_id,
        descripcion
      )
    )
  `)
      .eq('destinos.id', destinoId)
      .order('orden', { ascending: true });


    if (error) throw error;

    const hotelesUI = (data ?? []).map((h: any) => {

      const t = h.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const tEs = h.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const regT = h.regimen?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const regEs = h.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const descT = h.descuento?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const descEs = h.descuento?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        ...h,
        nombre_hotel: t?.nombre_hotel ?? tEs?.nombre_hotel ?? '',
        descripcion: t?.descripcion ?? tEs?.descripcion ?? '',

        regimen: h.regimen
          ? { ...h.regimen, descripcion: regT?.descripcion ?? '' }
          : null,

        descuento: h.descuento
          ? { ...h.descuento, tipo_descuento: descT?.descripcion ?? '' }
          : null,
      };
    });

    return hotelesUI;
  }

  async listHotelesAllPorDestinoPadre(idDestinoPadre: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);

    const { data, error } = await this.client
      .from('hoteles')
      .select(`
      id, created_at, estrellas, fondo, orden, ubicacion,

      traducciones:hotel_traducciones (
        idioma_id,
        nombre_hotel,
        descripcion
      ),

      descuento:descuento_id (
        id,
        icono,
        traducciones:descuentos_traducciones (
          idioma_id,
          descripcion
        )
      ),

      destinos:destino_id!inner (
        id,
        nombre,
        tipo_desino_id,
        destino_padre_id,
        destino_padre:destino_padre_id ( nombre ),
        imagen_destino
      ),

      concepto:concepto_id ( id, descripcion, icono ),

      regimen:regimen_id (
        id,
        traducciones:regimen_traducciones (
          idioma_id,
          descripcion
        )
      )
    `)
      .eq('destinos.destino_padre_id', idDestinoPadre)
      .order('orden', { ascending: true });

    if (error) throw error;

    const hotelesUI = (data ?? []).map((h: any) => {

      const t = h.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const tEs = h.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const regT = h.regimen?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const regEs = h.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      const descT = h.descuento?.traducciones?.find((x: any) => x.idioma_id === idiomaId);
      const descEs = h.descuento?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        ...h,

        nombre_hotel: t?.nombre_hotel ?? '',
        regimen: h.regimen
          ? { ...h.regimen, descripcion: regT?.descripcion ?? '' }
          : null,

        descuento: h.descuento
          ? { ...h.descuento, tipo_descuento: descT?.descripcion ?? '' }
          : null,
      };
    });

    return hotelesUI;
  }

  async infoHotel(idHotel: number, lang?: string) {
    const idiomaId = await this.getIdiomaId(lang);

    const { data, error } = await this.client
      .from('hoteles')
      .select(`
    id,
    ubicacion,
    fondo,
    estrellas,
    orden,
    destino_id,
    descuento_id,
    concepto_id,
    regimen_id,
    
    destino:destinos!hoteles_destino_id_fkey (
    id,
    nombre
  ),

    traducciones:hotel_traducciones!hotel_traducciones_hotel_id_fkey (
      idioma_id,
      nombre_hotel,
      descripcion
    ),

    imagenes:imagenes_hoteles!imagenes_hoteles_hotel_id_fkey (
      id,
      url_imagen,
      tipo_imagen_id,

      tipo:tipos_imagen!imagenes_hoteles_tipo_imagen_id_fkey (
        id,
        clave
      )
    ),

    actividades:actividades_hotel!actividades_hotel_hotel_id_fkey (
      actividad:actividades!actividades_hotel_actividad_id_fkey (
        id,
        descripcion,
        traducciones:actividades_traducciones (
          idioma_id,
          descripcion
        )
      )
    ),

    regimenes:regimen_hotel!regimen_hotel_hotel_id_fkey (
      regimen:regimen!regimen_hotel_regimen_id_fkey (
        id,
        traducciones:regimen_traducciones (
          idioma_id,
          descripcion
        )
      )
    )
  `)
      .eq('id', idHotel)
      .maybeSingle();


    if (error) throw error;
    if (!data) return null;

    const actividadesTraducidas = (data?.actividades)
      .map((x: any) => {
        const act = x.actividad;
        const tLang = act?.traducciones?.find(
          (t: any) => t.idioma_id === idiomaId
        );

        if (!tLang?.descripcion) return '';

        return {
          id: act.id,
          descripcion: tLang.descripcion,
        };
      })
      .filter(Boolean);


    const tLang = data.traducciones?.find((t: any) => t.idioma_id === idiomaId);

    const tEs = data.traducciones?.find((t: any) => t.idioma_id === 1);

    const traducida = tLang ?? null;

    const regimenesTraducidos = (data?.regimenes ?? []).flatMap((x: any) => {
      const r = x.regimen;
      const tLang = r?.traducciones?.find((t: any) => t.idioma_id === idiomaId);

      const tEs = r?.traducciones?.find(
        (t: any) => t.idioma_id === 1
      );
      return tLang?.descripcion
        ? [{ id: r.id, descripcion: tLang.descripcion, es: tEs?.descripcion }]
        : [];
    });

    const datos = {
      ...data,
      nombre_hotel: traducida?.nombre_hotel ?? tEs?.nombre_hotel,
      descripcion: traducida?.descripcion ?? this.transloco.translate('sin-descripcion'),
      actividades: actividadesTraducidas,
      regimenes: regimenesTraducidos
    };

    return datos;
  }

  empleados(options?: { incluirInhabilitados?: boolean }) {
    let query = this.client
      .from('empleados')
      .select('id, nombre, estatus_id, email, auth_user_id, primera_vez_login')
      .order('id', { ascending: true });

    if (!options?.incluirInhabilitados) {
      query = query.or('estatus_id.is.null,estatus_id.eq.1');
    }

    return query;
  }

  async guardarAccesoEmpleadoAdmin(payload: {
    empleadoId: number;
    email: string;
    nombre?: string;
    permissionIds?: number[];
    roleId?: number | null;
  }) {
    const { data, error } = await this.client.functions.invoke('empleados-auth', {
      body: {
        action: 'upsert',
        empleadoId: payload.empleadoId,
        email: payload.email,
        nombre: payload.nombre ?? '',
        permissionIds: payload.permissionIds ?? [],
        roleId: payload.roleId ?? null,
      }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.message ?? 'No se pudo guardar el acceso del empleado.');
    return data;
  }

  async quitarAccesoEmpleadoAdmin(empleadoId: number) {
    const { data, error } = await this.client.functions.invoke('empleados-auth', {
      body: {
        action: 'remove',
        empleadoId,
      }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.message ?? 'No se pudo quitar el acceso del empleado.');
    return data;
  }

  async completarPrimerLoginEmpleado(password: string) {
    const nextPassword = String(password ?? '').trim();
    if (nextPassword.length < 6) {
      throw new Error('La contrasena debe tener al menos 6 caracteres.');
    }

    const { error: updatePasswordError } = await this.client.auth.updateUser({
      password: nextPassword,
    });

    if (updatePasswordError) throw updatePasswordError;

    const { data, error } = await this.client.functions.invoke('empleados-auth', {
      body: {
        action: 'complete-first-login',
        password: nextPassword,
      }
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.message ?? 'No se pudo actualizar la contrasena.');

    await this.client.auth.refreshSession();
    return data;
  }

  async crearEmpleadoAdmin(payload: { nombre: string }) {
    const nombre = String(payload.nombre ?? '').trim();
    const { data, error } = await this.client
      .from('empleados')
      .insert({ nombre, estatus_id: 1 })
      .select('id, nombre, estatus_id, email, auth_user_id, primera_vez_login')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarEmpleadoAdmin(id: number, payload: { nombre: string }) {
    const nombre = String(payload.nombre ?? '').trim();
    const { data, error } = await this.client
      .from('empleados')
      .update({ nombre })
      .eq('id', id)
      .select('id, nombre, estatus_id, email, auth_user_id, primera_vez_login')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarEstatusEmpleadoAdmin(id: number, estatusId: number) {
    const { data, error } = await this.client
      .from('empleados')
      .update({ estatus_id: estatusId })
      .eq('id', id)
      .select('id, nombre, estatus_id, email, auth_user_id, primera_vez_login')
      .single();

    if (error) throw error;
    return data;
  }

  async eliminarEmpleadoAdmin(id: number) {
    const { error } = await this.client
      .from('empleados')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: 1 };
  }

  permisosAdmin() {
    return this.client
      .from('permissions')
      .select('id, key, description')
      .order('id', { ascending: true });
  }

  async crearPermisoAdmin(payload: { key: string; description: string }) {
    const { data, error } = await this.client
      .from('permissions')
      .insert({
        key: payload.key,
        description: payload.description,
      })
      .select('id, key, description')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarPermisoAdmin(id: number, payload: { key: string; description: string }) {
    const { data, error } = await this.client
      .from('permissions')
      .update({
        key: payload.key,
        description: payload.description,
      })
      .eq('id', id)
      .select('id, key, description')
      .single();

    if (error) throw error;
    return data;
  }

  async eliminarPermisoAdmin(id: number) {
    const { error } = await this.client
      .from('permissions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: 1 };
  }

  rolesAdmin() {
    return this.client
      .from('roles')
      .select('id, key, name')
      .order('id', { ascending: true });
  }

  async crearRolAdmin(payload: { key: string; name: string }) {
    const { data, error } = await this.client
      .from('roles')
      .insert({
        key: payload.key,
        name: payload.name,
      })
      .select('id, key, name')
      .single();

    if (error) throw error;
    return data;
  }

  async actualizarRolAdmin(id: number, payload: { key: string; name: string }) {
    const { data, error } = await this.client
      .from('roles')
      .update({
        key: payload.key,
        name: payload.name,
      })
      .eq('id', id)
      .select('id, key, name')
      .single();

    if (error) throw error;
    return data;
  }

  async eliminarRolAdmin(id: number) {
    const { error: rolePermissionsError } = await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', id);

    if (rolePermissionsError) throw rolePermissionsError;

    const { error } = await this.client
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: 1 };
  }

  async permisosRolAdmin(roleId: number): Promise<number[]> {
    const { data, error } = await this.client
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (error) throw error;

    return (data ?? [])
      .map((item: any) => Number(item.permission_id))
      .filter((id) => Number.isFinite(id));
  }

  async guardarPermisosRolAdmin(roleId: number, permissionIds: number[]) {
    const idsUnicos = [...new Set(permissionIds)]
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    const { error: deleteError } = await this.client
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    if (deleteError) throw deleteError;

    if (!idsUnicos.length) {
      return [];
    }

    const payload = idsUnicos.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId,
    }));

    const { data, error } = await this.client
      .from('role_permissions')
      .insert(payload)
      .select('role_id, permission_id');

    if (error) throw error;
    return data ?? [];
  }

  async rolesEmpleadoAdmin(empleadoId: number): Promise<number[]> {
    const { data: empleado, error: empleadoError } = await this.client
      .from('empleados')
      .select('auth_user_id')
      .eq('id', empleadoId)
      .maybeSingle();

    if (empleadoError) throw empleadoError;

    const userId = String(empleado?.auth_user_id ?? '').trim();
    if (!userId) {
      return [];
    }

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const roleKey = String(profile?.role ?? '').trim();
    if (!roleKey) {
      return [];
    }

    const { data: role, error: roleError } = await this.client
      .from('roles')
      .select('id')
      .eq('key', roleKey)
      .maybeSingle();

    if (roleError) throw roleError;

    return role?.id ? [Number(role.id)] : [];
  }

  async permisosEmpleadoAdmin(empleadoId: number): Promise<number[]> {
    const { data: empleado, error: empleadoError } = await this.client
      .from('empleados')
      .select('auth_user_id')
      .eq('id', empleadoId)
      .maybeSingle();

    if (empleadoError) throw empleadoError;

    const userId = String(empleado?.auth_user_id ?? '').trim();
    if (!userId) {
      return [];
    }

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const roleKey = String(profile?.role ?? '').trim();
    if (!roleKey) {
      return [];
    }

    const { data: role, error: roleError } = await this.client
      .from('roles')
      .select('id')
      .eq('key', roleKey)
      .maybeSingle();

    if (roleError) throw roleError;
    if (!role?.id) return [];

    const { data, error } = await this.client
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id);

    if (error) throw error;

    return (data ?? [])
      .map((item: any) => Number(item.permission_id))
      .filter((id) => Number.isFinite(id));
  }

  continentes() {
    return this.client
      .from('continentes')
      .select('*')
      .order('id', { ascending: true });
  }

  obtenerDestinos(id: number) {
    return this.client
      .from('destinos')
      .select('id, nombre, orden, imagen_destino,  continente:continente_id ( id, nombre )')
      .eq('tipo_desino_id', id)
      .is('destino_padre_id', null)
      .order('orden', { ascending: true });
  }

  async obtenerDestinoPorId(id: number) {
    const { data, error } = await this.client
      .from('destinos')
      .select('id, nombre, orden, tipo_desino_id, destino_padre_id, continente_id, imagen_destino, imagen_cotizacion')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async obtenerTiposDestinoAdmin() {
    const { data, error } = await this.client
      .from('tipo_destinos')
      .select('id, nombre')
      .order('id', { ascending: true });

    if (!error && data?.length) {
      return data;
    }

    const { data: destinos, error: errorDestinos } = await this.client
      .from('destinos')
      .select('tipo_desino_id')
      .not('tipo_desino_id', 'is', null);

    if (errorDestinos) throw errorDestinos;

    const idsUnicos = [...new Set((destinos ?? []).map((x: any) => x.tipo_desino_id))]
      .filter((id) => Number.isFinite(id))
      .sort((a, b) => a - b);

    return idsUnicos.map((id: number) => ({
      id,
      nombre: id === 1 ? 'NACIONAL' : id === 2 ? 'INTERNACIONAL' : `TIPO ${id}`
    }));
  }

  async obtenerDestinosPadreTipoDos(excluirId?: number) {
    let query = this.client
      .from('destinos')
      .select('id, nombre')
      .eq('tipo_desino_id', 2)
      .is('destino_padre_id', null)
      .order('nombre', { ascending: true });

    if (excluirId) {
      query = query.neq('id', excluirId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data ?? [];
  }

  async actualizarDestinoAdmin(
    id: number,
    payload: {
      nombre: string;
      orden: number | null;
      tipo_desino_id: number;
      destino_padre_id: number | null;
      continente_id: number | null;
      imagen_destino: string | null;
      imagen_cotizacion: string | null;
    }
  ) {
    const { data, error } = await this.client
      .from('destinos')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async crearDestinoAdmin(
    payload: {
      nombre: string;
      orden: number | null;
      tipo_desino_id: number;
      destino_padre_id: number | null;
      continente_id: number | null;
      imagen_destino: string | null;
      imagen_cotizacion: string | null;
    }
  ) {
    const { data, error } = await this.client
      .from('destinos')
      .insert(payload)
      .select('id');

    if (error) throw error;
    return data;
  }

  async obtenerIdiomasPreviewAdmin() {
    const { data, error } = await this.client
      .from('idiomas')
      .select('id, codigo, nombre, orden')
      .order('orden', { ascending: true });

    if (error) throw error;

    const permitidos = new Set<string>(CODIGOS_IDIOMA_PREVIEW);
    return (data ?? [])
      .filter((item: any) => permitidos.has(String(item.codigo ?? '').toLowerCase()))
      .map((item: any) => ({
        id: item.id,
        codigo: String(item.codigo ?? '').toLowerCase(),
        nombre: item.nombre
      })) as IIdiomaPreviewAdmin[];
  }

  async obtenerPreviewDestinoAdmin(destinoId: number): Promise<IPreviewDestinoAdmin> {
    const [idiomas, destino] = await Promise.all([
      this.obtenerIdiomasPreviewAdmin(),
      this.obtenerDestinoPorId(destinoId)
    ]);

    if (!destino) {
      throw new Error('No se encontro el destino solicitado.');
    }

    const { data: detalle, error: detalleError } = await this.client
      .from('detalles_destinos')
      .select('id, ubicacion, destino_id')
      .eq('destino_id', destinoId)
      .maybeSingle();

    if (detalleError) throw detalleError;

    const idiomaIds = idiomas.map((x) => x.id);
    const detalleId = detalle?.id ?? null;
    const { data: catalogoTiposRaw, error: catalogoTiposError } = await this.client
      .from('tipo_dato_rapido')
      .select(`
        id,
        clave,
        icono,
        tipo_valor,
        traducciones:tipo_dato_rapido_traducciones (
          idioma_id,
          nombre
        )
      `)
      .order('id', { ascending: true });

    if (catalogoTiposError) throw catalogoTiposError;

    const { data: catalogoAtraccionesRaw, error: catalogoAtraccionesError } = await this.client
      .from('catalogo_atracciones')
      .select(`
        id,
        clave,
        traducciones:catalogo_atracciones_traducciones (
          idioma_id,
          nombre
        )
      `)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (catalogoAtraccionesError) throw catalogoAtraccionesError;

    const catalogoTipos = (catalogoTiposRaw ?? []).map((tipo: any) => ({
      id: tipo.id,
      clave: tipo.clave,
      icono: tipo.icono ?? null,
      tipo_valor: tipo.tipo_valor ?? null,
      nombre:
        tipo?.traducciones?.find((x: any) => x.idioma_id === ES_ID)?.nombre ??
        tipo?.traducciones?.[0]?.nombre ??
        tipo?.clave ??
        ''
    }));

    const catalogoAtracciones = (catalogoAtraccionesRaw ?? []).map((item: any) => ({
      id: Number(item.id),
      clave: item.clave ?? '',
      nombre:
        item?.traducciones?.find((x: any) => x.idioma_id === ES_ID)?.nombre ??
        item?.traducciones?.[0]?.nombre ??
        item?.clave ??
        ''
    }));

    let traducciones: any[] = [];
    let detallesRapidos: any[] = [];
    let detallesRapidosTraducciones: any[] = [];
    let actividades: any[] = [];
    let actividadesTraducciones: any[] = [];
    let actividadesCarpetas: any[] = [];
    const imagenesActividadPorId = new Map<number, any[]>();
    const carpetasActividadPorId = new Map<number, any[]>();
    if (detalleId) {
      const [traduccionesResponse, detallesRapidosResponse] = await Promise.all([
        this.client
          .from('detalles_destinos_traducciones')
          .select('idioma_id, nombre, apodo, descripcion_corta, descripcion_larga, titulo_descripcion')
          .eq('detalles_destinos_id', detalleId)
          .in('idioma_id', idiomaIds),
        this.client
          .from('detalles_destinos_datos_rapidos')
          .select(`
            id,
            orden,
            tipo_dato_rapido_id,
            tipo:tipo_dato_rapido_id (
              id,
              clave,
              icono,
              tipo_valor,
              traducciones:tipo_dato_rapido_traducciones (
                idioma_id,
                nombre
              )
            )
          `)
          .eq('detalles_destinos_id', detalleId)
          .order('orden', { ascending: true })
      ]);

      if (traduccionesResponse.error) throw traduccionesResponse.error;
      if (detallesRapidosResponse.error) throw detallesRapidosResponse.error;

      traducciones = traduccionesResponse.data ?? [];
      detallesRapidos = detallesRapidosResponse.data ?? [];
      const detallesRapidosIds = detallesRapidos.map((item: any) => item.id);

      if (detallesRapidosIds.length) {
        const { data: dataDetallesRapidosTraducciones, error: detallesRapidosTraduccionesError } =
          await this.client
            .from('detalles_destinos_datos_rapidos_traducciones')
            .select('detalles_destinos_dato_rapido_id, idioma_id, valor')
            .in('detalles_destinos_dato_rapido_id', detallesRapidosIds)
            .in('idioma_id', idiomaIds);

        if (detallesRapidosTraduccionesError) throw detallesRapidosTraduccionesError;
        detallesRapidosTraducciones = dataDetallesRapidosTraducciones ?? [];
      }

      const { data: actividadesData, error: actividadesError } = await this.client
        .from('atracciones_principales')
        .select(`
          id,
          imagen_fondo,
          detalles_destino_id
        `)
        .eq('detalles_destino_id', detalleId)
        .order('id', { ascending: true });

      if (actividadesError) throw actividadesError;
      actividades = actividadesData ?? [];

      const actividadIds = actividades.map((item: any) => item.id);
      if (actividadIds.length) {
        const [imagenesActividadResponse, carpetasActividadResponse] = await Promise.all([
          this.client
            .from('atracciones_imagenes')
            .select(`
              id,
              atraccion_id,
              imagen_url,
              carpeta_id,
              carpeta,
              activa,
              orden,
              vigencia_desde,
              vigencia_hasta,
              created_at,
              nombre,
              extension,
              mime_type,
              size,
              size_formatted
            `)
            .in('atraccion_id', actividadIds)
            .order('orden', { ascending: true })
            .order('id', { ascending: true }),
          this.client
            .from('atracciones_carpetas')
            .select('id, atraccion_id, nombre, orden, created_at, updated_at')
            .in('atraccion_id', actividadIds)
            .order('orden', { ascending: true })
            .order('id', { ascending: true })
        ]);

        const { data: imagenesActividadData, error: imagenesActividadError } = imagenesActividadResponse;
        const { data: carpetasActividadData, error: carpetasActividadError } = carpetasActividadResponse;

        if (imagenesActividadError) throw imagenesActividadError;
        if (carpetasActividadError) throw carpetasActividadError;



        actividadesCarpetas = carpetasActividadData ?? [];

        (imagenesActividadData ?? []).forEach((imagen: any) => {
          const atraccionId = Number(imagen.atraccion_id);
          if (!imagenesActividadPorId.has(atraccionId)) {
            imagenesActividadPorId.set(atraccionId, []);
          }

          imagenesActividadPorId.get(atraccionId)?.push(imagen);
        });
      }

      if (actividadIds.length) {
        const { data: actividadesTrResponse, error: actividadesTraduccionesError } = await this.client
          .from('atracciones_principales_traducciones')
          .select('atracciones_principales_id, idioma_id, nombre, descripcion')
          .in('atracciones_principales_id', actividadIds)
          .in('idioma_id', idiomaIds);

        if (actividadesTraduccionesError) throw actividadesTraduccionesError;
        actividadesTraducciones = actividadesTrResponse ?? [];
      }
      actividadesCarpetas.forEach((item: any) => {
        const atraccionId = Number(item.atraccion_id);
        if (!carpetasActividadPorId.has(atraccionId)) {
          carpetasActividadPorId.set(atraccionId, []);
        }

        carpetasActividadPorId.get(atraccionId)?.push(item);
      });
    } else {
      detallesRapidos = catalogoTipos.map((tipo: any, index: number) => ({
        id: -(index + 1),
        orden: index + 1,
        tipo_dato_rapido_id: tipo.id,
        tipo: {
          ...tipo,
          traducciones: [{ idioma_id: ES_ID, nombre: tipo.nombre }]
        }
      }));
    }

    const traduccionesPorIdioma = new Map<number, any>();
    traducciones.forEach((item: any) => traduccionesPorIdioma.set(item.idioma_id, item));

    const datosPreview = idiomas.map((idioma) => {
      const traduccion = traduccionesPorIdioma.get(idioma.id);
      const nombreFallback = idioma.codigo === 'es' ? destino.nombre ?? '' : '';
      return {
        idioma_id: idioma.id,
        nombre: traduccion?.nombre ?? nombreFallback,
        apodo: traduccion?.apodo ?? '',
        descripcion_corta: traduccion?.descripcion_corta ?? '',
        descripcion_larga: traduccion?.descripcion_larga ?? '',
        titulo_descripcion: traduccion?.titulo_descripcion ?? ''
      };
    });

    const valoresPorDetalleRapido = new Map<number, Map<number, string>>();
    detallesRapidosTraducciones.forEach((item: any) => {
      if (!valoresPorDetalleRapido.has(item.detalles_destinos_dato_rapido_id)) {
        valoresPorDetalleRapido.set(item.detalles_destinos_dato_rapido_id, new Map<number, string>());
      }

      valoresPorDetalleRapido
        .get(item.detalles_destinos_dato_rapido_id)
        ?.set(item.idioma_id, item.valor ?? '');
    });

    const traduccionesActividadPorId = new Map<number, Map<number, { nombre: string; descripcion: string }>>();
    actividadesTraducciones.forEach((item: any) => {
      if (!traduccionesActividadPorId.has(item.atracciones_principales_id)) {
        traduccionesActividadPorId.set(item.atracciones_principales_id, new Map());
      }

      traduccionesActividadPorId
        .get(item.atracciones_principales_id)
        ?.set(item.idioma_id, {
          nombre: item.nombre ?? '',
          descripcion: item.descripcion ?? ''
        });
    });

    return {
      detalles_destinos_id: detalleId,
      destino_id: destinoId,
      destino_nombre: destino.nombre ?? '',
      ubicacion: detalle?.ubicacion ?? '',
      idiomas,
      traducciones: datosPreview,
      catalogo_tipos_dato_rapido: catalogoTipos,
      actividades: (actividades ?? []).map((actividad: any) => {
        const traduccionesActividad = traduccionesActividadPorId.get(actividad.id) ?? new Map();
        const imagenesActividad = imagenesActividadPorId.get(Number(actividad.id)) ?? [];
        const carpetasActividad = carpetasActividadPorId.get(Number(actividad.id)) ?? [];
        const carpetasActividadMap = new Map<number, any>(
          carpetasActividad
            .map((carpeta: any) => [this.parseNumber(carpeta?.id), carpeta] as const)
            .filter(([id]) => id !== null) as Array<readonly [number, any]>
        );
        const carpetasActividadPorClave = new Map<string, any>(
          carpetasActividad.map((carpeta: any) => [this.claveCarpeta(carpeta?.nombre), carpeta] as const)
        );
        const imagenesOrdenadas = this.ordenarImagenesGaleria(
          imagenesActividad.map((imagen: any) => {
            const carpetaIdCrudo = this.parseNumber(imagen.carpeta_id);
            const carpetaPorId = carpetaIdCrudo !== null ? carpetasActividadMap.get(carpetaIdCrudo) : null;
            const carpetaPorNombre = carpetasActividadPorClave.get(
              this.claveCarpeta(carpetaPorId?.nombre ?? imagen.carpeta_nombre ?? imagen.carpeta)
            );
            const nombreCarpetaResuelto =
              carpetaPorId?.nombre ?? carpetaPorNombre?.nombre ?? imagen.carpeta_nombre ?? imagen.carpeta ?? null;
            const nombreCarpetaNormalizado = this.normalizarNombreCarpeta(nombreCarpetaResuelto) ?? null;
            const carpetaId = carpetaIdCrudo ?? this.parseNumber(carpetaPorNombre?.id);

            return {
              id: Number(imagen.id),
              imagen_url: imagen.imagen_url ?? '',
              carpeta_id: carpetaId,
              carpeta_nombre: nombreCarpetaNormalizado,
              carpeta: nombreCarpetaNormalizado,
              nombre: imagen.nombre ?? null,
              extension: imagen.extension ?? null,
              mime_type: imagen.mime_type ?? null,
              size: this.parseBigint(imagen.size),
              size_formatted: imagen.size_formatted ?? null,
              activa: Boolean(imagen.activa),
              orden: imagen.orden ?? null,
              vigencia_desde: imagen.vigencia_desde ?? null,
              vigencia_hasta: imagen.vigencia_hasta ?? null,
              created_at: imagen.created_at ?? null
            };
          })
        );
        const imagenSeleccionada = this.seleccionarImagenGaleria(imagenesOrdenadas);
        const imagenFondoUrl = imagenSeleccionada?.imagen_url ?? actividad.imagen_fondo ?? '';
        const imagenFondoRegistro =
          imagenSeleccionada ??
          imagenesOrdenadas.find((imagen: any) => imagen.imagen_url === actividad.imagen_fondo) ??
          null;
        const imagenFondoId = this.parseNumber(imagenFondoRegistro?.id);
        const recordTraducciones: Record<number, { nombre: string; descripcion: string }> = {};



        idiomas.forEach((idioma) => {
          recordTraducciones[idioma.id] = traduccionesActividad.get(idioma.id) ?? {
            nombre: '',
            descripcion: ''
          };
        });

        return {
          id: actividad.id,
          imagen_fondo: imagenFondoUrl,
          imagen_fondo_id: imagenFondoId,
          imagen_seleccionada: imagenFondoUrl,
          imagen_seleccionada_id: imagenFondoId,
          carpetas: carpetasActividad,
          imagenes: imagenesOrdenadas.map((imagen: any) => ({
            id: Number(imagen.id),
            imagen_url: imagen.imagen_url ?? '',
            carpeta_id: this.parseNumber(imagen.carpeta_id),
            carpeta_nombre: this.normalizarNombreCarpeta(imagen.carpeta_nombre ?? imagen.carpeta) ?? null,
            carpeta: this.normalizarNombreCarpeta(imagen.carpeta_nombre ?? imagen.carpeta) ?? null,
            nombre: imagen.nombre ?? null,
            extension: imagen.extension ?? null,
            mime_type: imagen.mime_type ?? null,
            size: this.parseBigint(imagen.size),
            size_formatted: imagen.size_formatted ?? null,
            activa: Boolean(imagen.activa),
            orden: imagen.orden ?? null,
            vigencia_desde: imagen.vigencia_desde ?? null,
            vigencia_hasta: imagen.vigencia_hasta ?? null,
            created_at: imagen.created_at ?? null
          })),
          traducciones: recordTraducciones
        } as IActividadPreviewAdmin;
      }),
      detalles_rapidos: (detallesRapidos ?? []).map((item: any) => {
        const valores = valoresPorDetalleRapido.get(item.id) ?? new Map<number, string>();
        const recordValores: Record<number, string> = {};

        idiomas.forEach((idioma) => {
          recordValores[idioma.id] = valores.get(idioma.id) ?? '';
        });

        return {
          id: item.id,
          tipo_dato_rapido_id: item.tipo_dato_rapido_id,
          clave: item.tipo?.clave ?? '',
          nombre:
            item.tipo?.traducciones?.find((x: any) => x.idioma_id === ES_ID)?.nombre ??
            item.tipo?.traducciones?.[0]?.nombre ??
            item.tipo?.clave ??
            '',
          icono: item.tipo?.icono ?? null,
          tipo_valor: item.tipo?.tipo_valor ?? null,
          orden: item.orden ?? null,
          valores: recordValores
        } as IDetalleRapidoPreviewAdmin;
      })
    };
  }

  async guardarPreviewDestinoAdmin(payload: {
    destino_id: number;
    ubicacion: string | null;
    traducciones: Array<{
      idioma_id: number;
      nombre: string | null;
      apodo: string | null;
      descripcion_corta: string | null;
      descripcion_larga: string | null;
      titulo_descripcion: string | null;
    }>;
    detalles_rapidos: Array<{
      tipo_dato_rapido_id: number;
      orden: number | null;
      valores: Array<{
        idioma_id: number;
        valor: string | null;
      }>;
    }>;
    actividades: Array<{
      id: number | null;
      imagen_fondo: string | null;
      imagenes?: Array<{
        id?: number | null;
        imagen_url: string | null;
        carpeta_id?: number | null;
        carpeta_nombre?: string | null;
        carpeta?: string | null;
        nombre?: string | null;
        extension?: string | null;
        mime_type?: string | null;
        mimeType?: string | null;
        size?: number | null;
        size_formatted?: string | null;
        sizeFormatted?: string | null;
        activa?: boolean;
        orden?: number | null;
        vigencia_desde?: string | null;
        vigencia_hasta?: string | null;
      }>;
      traducciones: Array<{
        idioma_id: number;
        nombre: string | null;
        descripcion: string | null;
      }>;
    }>;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;

    let detallesDestinosId = detalleExistente?.id;

    if (detallesDestinosId) {
      const { error: actualizarDetalleError } = await this.client
        .from('detalles_destinos')
        .update({ ubicacion: payload.ubicacion })
        .eq('id', detallesDestinosId);

      if (actualizarDetalleError) throw actualizarDetalleError;
    } else {
      const { data: nuevoDetalle, error: crearDetalleError } = await this.client
        .from('detalles_destinos')
        .insert({
          destino_id: payload.destino_id,
          ubicacion: payload.ubicacion
        })
        .select('id')
        .single();

      if (crearDetalleError) throw crearDetalleError;
      detallesDestinosId = nuevoDetalle.id;
    }

    const traduccionesPayload = payload.traducciones.map((item) => ({
      detalles_destinos_id: detallesDestinosId,
      idioma_id: item.idioma_id,
      nombre: item.nombre,
      apodo: item.apodo,
      descripcion_corta: item.descripcion_corta,
      descripcion_larga: item.descripcion_larga,
      titulo_descripcion: item.titulo_descripcion
    }));

    const { error: traduccionesError } = await this.client
      .from('detalles_destinos_traducciones')
      .upsert(traduccionesPayload, { onConflict: 'detalles_destinos_id,idioma_id' });

    if (traduccionesError) throw traduccionesError;

    const { data: detallesRapidosExistentes, error: detallesRapidosExistentesError } = await this.client
      .from('detalles_destinos_datos_rapidos')
      .select('id, tipo_dato_rapido_id')
      .eq('detalles_destinos_id', detallesDestinosId);

    if (detallesRapidosExistentesError) throw detallesRapidosExistentesError;

    const mapaDetalleRapidoPorTipo = new Map<number, number>();
    (detallesRapidosExistentes ?? []).forEach((item: any) => {
      mapaDetalleRapidoPorTipo.set(item.tipo_dato_rapido_id, item.id);
    });

    const faltantes = payload.detalles_rapidos
      .filter((item) => !mapaDetalleRapidoPorTipo.has(item.tipo_dato_rapido_id))
      .map((item, index) => ({
        detalles_destinos_id: detallesDestinosId,
        tipo_dato_rapido_id: item.tipo_dato_rapido_id,
        orden: item.orden ?? index + 1
      }));

    if (faltantes.length) {
      const { data: insertados, error: insertadosError } = await this.client
        .from('detalles_destinos_datos_rapidos')
        .insert(faltantes)
        .select('id, tipo_dato_rapido_id');

      if (insertadosError) throw insertadosError;
      (insertados ?? []).forEach((item: any) => mapaDetalleRapidoPorTipo.set(item.tipo_dato_rapido_id, item.id));
    }

    await Promise.all(
      payload.detalles_rapidos.map((item, index) =>
        this.client
          .from('detalles_destinos_datos_rapidos')
          .update({ orden: item.orden ?? index + 1 })
          .eq('detalles_destinos_id', detallesDestinosId)
          .eq('tipo_dato_rapido_id', item.tipo_dato_rapido_id)
      )
    );

    const valoresPayload = payload.detalles_rapidos.flatMap((detalleRapido) => {
      const detalleRapidoId = mapaDetalleRapidoPorTipo.get(detalleRapido.tipo_dato_rapido_id);
      if (!detalleRapidoId) {
        return [];
      }

      return detalleRapido.valores.map((valor) => ({
        detalles_destinos_dato_rapido_id: detalleRapidoId,
        idioma_id: valor.idioma_id,
        valor: valor.valor
      }));
    });

    if (valoresPayload.length) {
      const { error: valoresError } = await this.client
        .from('detalles_destinos_datos_rapidos_traducciones')
        .upsert(valoresPayload, { onConflict: 'detalles_destinos_dato_rapido_id,idioma_id' });

      if (valoresError) throw valoresError;
    }

    const { data: actividadesExistentes, error: actividadesExistentesError } = await this.client
      .from('atracciones_principales')
      .select('id')
      .eq('detalles_destino_id', detallesDestinosId);

    if (actividadesExistentesError) throw actividadesExistentesError;

    const idsExistentes = new Set((actividadesExistentes ?? []).map((x: any) => Number(x.id)));
    const mapaActividadId = new Map<number, number>();

    for (let index = 0; index < payload.actividades.length; index++) {
      const actividad = payload.actividades[index];
      const idActividad = Number(actividad.id);

      if (idActividad && idsExistentes.has(idActividad)) {
        const { error: updateActividadError } = await this.client
          .from('atracciones_principales')
          .update({ imagen_fondo: actividad.imagen_fondo })
          .eq('id', idActividad)
          .eq('detalles_destino_id', detallesDestinosId);

        if (updateActividadError) throw updateActividadError;
        mapaActividadId.set(index, idActividad);
        await this.sincronizarImagenesActividad(idActividad, actividad.imagenes);
        continue;
      }

      const { data: nuevaActividad, error: crearActividadError } = await this.client
        .from('atracciones_principales')
        .insert({
          detalles_destino_id: detallesDestinosId,
          imagen_fondo: actividad.imagen_fondo
        })
        .select('id')
        .single();

      if (crearActividadError) throw crearActividadError;
      const nuevaActividadId = Number(nuevaActividad.id);
      mapaActividadId.set(index, nuevaActividadId);
      await this.sincronizarImagenesActividad(nuevaActividadId, actividad.imagenes);
    }

    const traduccionesActividadesPayload = payload.actividades.flatMap((actividad, index) => {
      const actividadId = mapaActividadId.get(index);
      if (!actividadId) {
        return [];
      }

      return (actividad.traducciones ?? [])
        .filter((traduccion) => {
          const nombreLimpio = (traduccion.nombre ?? '').trim();
          return !!nombreLimpio;
        })
        .map((traduccion) => ({
          atracciones_principales_id: actividadId,
          idioma_id: traduccion.idioma_id,
          nombre: traduccion.nombre,
          descripcion: traduccion.descripcion
        }));
    });

    if (traduccionesActividadesPayload.length) {
      const { error: actividadesTraduccionesError } = await this.client
        .from('atracciones_principales_traducciones')
        .upsert(traduccionesActividadesPayload, { onConflict: 'atracciones_principales_id,idioma_id' });

      if (actividadesTraduccionesError) throw actividadesTraduccionesError;
    }

    for (let index = 0; index < payload.actividades.length; index++) {
      const actividad = payload.actividades[index];
      const actividadId = mapaActividadId.get(index);
      if (!actividadId) {
        continue;
      }

      const idiomasSinNombre = (actividad.traducciones ?? [])
        .filter((traduccion) => !((traduccion.nombre ?? '').trim()))
        .map((traduccion) => traduccion.idioma_id);

      if (!idiomasSinNombre.length) {
        continue;
      }

      const { error: borrarTraduccionesVaciasError } = await this.client
        .from('atracciones_principales_traducciones')
        .delete()
        .eq('atracciones_principales_id', actividadId)
        .in('idioma_id', idiomasSinNombre);

      if (borrarTraduccionesVaciasError) throw borrarTraduccionesVaciasError;
    }

    return { id: detallesDestinosId };
  }

  async actualizarOrdenDatosRapidosDestinoAdmin(
    destinoId: number,
    detallesRapidos: Array<{ tipo_dato_rapido_id: number; orden: number }>
  ) {
    const { data: detalle, error: detalleError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', destinoId)
      .maybeSingle();

    if (detalleError) throw detalleError;
    if (!detalle?.id || !detallesRapidos.length) {
      return { updated: 0 };
    }

    const resultados = await Promise.all(
      detallesRapidos.map((item) =>
        this.client
          .from('detalles_destinos_datos_rapidos')
          .update({ orden: item.orden })
          .eq('detalles_destinos_id', detalle.id)
          .eq('tipo_dato_rapido_id', item.tipo_dato_rapido_id)
      )
    );

    const error = resultados.find((r) => r.error)?.error;
    if (error) throw error;

    return { updated: detallesRapidos.length };
  }

  async guardarActividadDestinoAdmin(payload: {
    destino_id: number;
    actividad_id?: number | null;
    imagen_fondo: string | null;
    imagen_activa_id?: number | null;
    imagenes?: Array<{
      id?: number | null;
      imagen_url: string | null;
      carpeta_id?: number | null;
      carpeta_nombre?: string | null;
      carpeta?: string | null;
      nombre?: string | null;
      extension?: string | null;
      mime_type?: string | null;
      mimeType?: string | null;
      size?: number | null;
      size_formatted?: string | null;
      sizeFormatted?: string | null;
      activa?: boolean;
      orden?: number | null;
      vigencia_desde?: string | null;
      vigencia_hasta?: string | null;
    }>;
    traducciones: Array<{
      idioma_id: number;
      nombre: string | null;
      descripcion: string | null;
    }>;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;

    let detallesDestinoId = detalleExistente?.id;
    if (!detallesDestinoId) {
      const { data: nuevoDetalle, error: crearDetalleError } = await this.client
        .from('detalles_destinos')
        .insert({
          destino_id: payload.destino_id,
          ubicacion: null
        })
        .select('id')
        .single();

      if (crearDetalleError) throw crearDetalleError;
      detallesDestinoId = nuevoDetalle.id;
    }

    let actividadId = payload.actividad_id ?? null;

    if (actividadId) {
      const { error: actualizarActividadError } = await this.client
        .from('atracciones_principales')
        .update({
          imagen_fondo: payload.imagen_fondo
        })
        .eq('id', actividadId)
        .eq('detalles_destino_id', detallesDestinoId);

      if (actualizarActividadError) throw actualizarActividadError;
      await this.sincronizarImagenesActividad(actividadId, payload.imagenes, payload.imagen_activa_id);
    } else {
      const { data: nuevaActividad, error: crearActividadError } = await this.client
        .from('atracciones_principales')
        .insert({
          detalles_destino_id: detallesDestinoId,
          imagen_fondo: payload.imagen_fondo
        })
        .select('id')
        .single();

      if (crearActividadError) throw crearActividadError;
      actividadId = nuevaActividad.id;
      await this.sincronizarImagenesActividad(actividadId, payload.imagenes, payload.imagen_activa_id);
    }

    const traduccionesPayload = payload.traducciones
      .filter((item) => {
        const nombreLimpio = (item.nombre ?? '').trim();
        return !!nombreLimpio;
      })
      .map((item) => ({
        atracciones_principales_id: actividadId,
        idioma_id: item.idioma_id,
        nombre: item.nombre,
        descripcion: item.descripcion
      }));

    if (traduccionesPayload.length) {
      const { error: traduccionesError } = await this.client
        .from('atracciones_principales_traducciones')
        .upsert(traduccionesPayload, {
          onConflict: 'atracciones_principales_id,idioma_id'
        });

      if (traduccionesError) throw traduccionesError;
    }

    const idiomasSinNombre = payload.traducciones
      .filter((item) => !((item.nombre ?? '').trim()))
      .map((item) => item.idioma_id);

    if (idiomasSinNombre.length) {
      const { error: borrarTraduccionesVaciasError } = await this.client
        .from('atracciones_principales_traducciones')
        .delete()
        .eq('atracciones_principales_id', actividadId)
        .in('idioma_id', idiomasSinNombre);

      if (borrarTraduccionesVaciasError) throw borrarTraduccionesVaciasError;
    }

    return { id: actividadId };
  }

  async guardarImagenesActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    imagen_fondo: string | null;
    imagen_activa_id?: number | null;
    imagenes?: Array<{
      id?: number | null;
      imagen_url: string | null;
      carpeta_id?: number | null;
      carpeta_nombre?: string | null;
      carpeta?: string | null;
      nombre?: string | null;
      extension?: string | null;
      mime_type?: string | null;
      mimeType?: string | null;
      size?: number | null;
      size_formatted?: string | null;
      sizeFormatted?: string | null;
      activa?: boolean;
      orden?: number | null;
      vigencia_desde?: string | null;
      vigencia_hasta?: string | null;
    }>;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      throw new Error('No se encontro el detalle del destino.');
    }

    const { error: actualizarActividadError } = await this.client
      .from('atracciones_principales')
      .update({ imagen_fondo: payload.imagen_fondo })
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id);

    if (actualizarActividadError) throw actualizarActividadError;

    await this.sincronizarImagenesActividad(payload.actividad_id, payload.imagenes, payload.imagen_activa_id);
    return { id: payload.actividad_id };
  }

  async guardarTraduccionesActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    traducciones: Array<{
      idioma_id: number;
      nombre: string | null;
      descripcion: string | null;
    }>;
  }) {
    const traduccionesPayload = payload.traducciones
      .filter((item) => {
        const nombreLimpio = (item.nombre ?? '').trim();
        return !!nombreLimpio;
      })
      .map((item) => ({
        atracciones_principales_id: payload.actividad_id,
        idioma_id: item.idioma_id,
        nombre: item.nombre,
        descripcion: item.descripcion
      }));

    if (traduccionesPayload.length) {
      const { error: traduccionesError } = await this.client
        .from('atracciones_principales_traducciones')
        .upsert(traduccionesPayload, {
          onConflict: 'atracciones_principales_id,idioma_id'
        });

      if (traduccionesError) throw traduccionesError;
    }

    const idiomasSinNombre = payload.traducciones
      .filter((item) => !((item.nombre ?? '').trim()))
      .map((item) => item.idioma_id);

    if (idiomasSinNombre.length) {
      const { error: borrarTraduccionesVaciasError } = await this.client
        .from('atracciones_principales_traducciones')
        .delete()
        .eq('atracciones_principales_id', payload.actividad_id)
        .in('idioma_id', idiomasSinNombre);

      if (borrarTraduccionesVaciasError) throw borrarTraduccionesVaciasError;
    }

    return { id: payload.actividad_id };
  }

  async actualizarImagenesActividadDestinoAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    imagen_fondo: string | null;
    imagen_activa_id?: number | null;
    imagenes: Array<{
      id?: number | null;
      imagen_url: string | null;
      carpeta_id?: number | null;
      carpeta_nombre?: string | null;
      carpeta?: string | null;
      nombre?: string | null;
      extension?: string | null;
      mime_type?: string | null;
      mimeType?: string | null;
      size?: number | null;
      size_formatted?: string | null;
      sizeFormatted?: string | null;
      activa?: boolean;
      orden?: number | null;
      vigencia_desde?: string | null;
      vigencia_hasta?: string | null;
    }>;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      throw new Error('No se encontro el detalle del destino.');
    }

    const { error: actualizarActividadError } = await this.client
      .from('atracciones_principales')
      .update({ imagen_fondo: payload.imagen_fondo })
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id);

    if (actualizarActividadError) throw actualizarActividadError;

    await this.sincronizarImagenesActividad(payload.actividad_id, payload.imagenes, payload.imagen_activa_id);
    return { id: payload.actividad_id };
  }

  async crearCarpetaActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    nombre: string;
  }) {
    const nombre = this.normalizarNombreCarpeta(payload.nombre);
    if (!nombre) {
      throw new Error('La carpeta no puede estar vacia.');
    }

    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      throw new Error('No se encontro el detalle del destino.');
    }

    const { data: actividad, error: actividadError } = await this.client
      .from('atracciones_principales')
      .select('id')
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id)
      .maybeSingle();

    if (actividadError) throw actividadError;
    if (!actividad?.id) {
      throw new Error('No se encontro la actividad solicitada.');
    }

    const { data: existente, error: existenteError } = await this.client
      .from('atracciones_carpetas')
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .eq('atraccion_id', payload.actividad_id)
      .ilike('nombre', nombre)
      .maybeSingle();

    if (existenteError) throw existenteError;
    if (existente) {
      const nombreNormalizado = this.normalizarNombreCarpeta(existente.nombre);
      if (existente.nombre !== nombreNormalizado) {
        const { error: updateExistenteError } = await this.client
          .from('atracciones_carpetas')
          .update({ nombre: nombreNormalizado })
          .eq('id', existente.id);

        if (updateExistenteError) throw updateExistenteError;
        existente.nombre = nombreNormalizado;
      }

      return existente;
    }

    const { data: ultimaCarpeta, error: ultimaCarpetaError } = await this.client
      .from('atracciones_carpetas')
      .select('orden')
      .eq('atraccion_id', payload.actividad_id)
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimaCarpetaError) throw ultimaCarpetaError;

    const { data: nuevaCarpeta, error: nuevaCarpetaError } = await this.client
      .from('atracciones_carpetas')
      .insert({
        atraccion_id: payload.actividad_id,
        nombre: this.normalizarNombreCarpeta(nombre),
        orden: Number(ultimaCarpeta?.orden ?? 0) + 1
      })
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .single();

    if (nuevaCarpetaError) throw nuevaCarpetaError;
    return nuevaCarpeta;
  }

  async renombrarCarpetaActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    carpeta_id: number;
    nombre: string;
  }) {
    const nombre = this.normalizarNombreCarpeta(payload.nombre);
    if (!nombre) {
      throw new Error('La carpeta no puede estar vacia.');
    }

    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      throw new Error('No se encontro el detalle del destino.');
    }

    const { data: actividad, error: actividadError } = await this.client
      .from('atracciones_principales')
      .select('id')
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id)
      .maybeSingle();

    if (actividadError) throw actividadError;
    if (!actividad?.id) {
      throw new Error('No se encontro la actividad solicitada.');
    }

    const { data: carpeta, error: carpetaError } = await this.client
      .from('atracciones_carpetas')
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .eq('id', payload.carpeta_id)
      .eq('atraccion_id', payload.actividad_id)
      .maybeSingle();

    if (carpetaError) throw carpetaError;
    if (!carpeta?.id) {
      throw new Error('No se encontro la carpeta solicitada.');
    }

    const { data: existente, error: existenteError } = await this.client
      .from('atracciones_carpetas')
      .select('id')
      .eq('atraccion_id', payload.actividad_id)
      .ilike('nombre', nombre)
      .neq('id', carpeta.id)
      .maybeSingle();

    if (existenteError) throw existenteError;
    if (existente) {
      throw new Error('Ya existe una carpeta con ese nombre.');
    }

    const { data: carpetaActualizada, error: actualizarError } = await this.client
      .from('atracciones_carpetas')
      .update({ nombre })
      .eq('id', carpeta.id)
      .eq('atraccion_id', payload.actividad_id)
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .single();

    if (actualizarError) throw actualizarError;

    const { error: actualizarImagenesError } = await this.client
      .from('atracciones_imagenes')
      .update({ carpeta: nombre })
      .eq('atraccion_id', payload.actividad_id)
      .eq('carpeta_id', carpeta.id);

    if (actualizarImagenesError) throw actualizarImagenesError;

    return carpetaActualizada;
  }

  async eliminarCarpetaActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    carpeta_id: number;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      throw new Error('No se encontro el detalle del destino.');
    }

    const { data: actividad, error: actividadError } = await this.client
      .from('atracciones_principales')
      .select('id')
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id)
      .maybeSingle();

    if (actividadError) throw actividadError;
    if (!actividad?.id) {
      throw new Error('No se encontro la actividad solicitada.');
    }

    const { data: carpeta, error: carpetaError } = await this.client
      .from('atracciones_carpetas')
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .eq('id', payload.carpeta_id)
      .eq('atraccion_id', payload.actividad_id)
      .maybeSingle();

    if (carpetaError) throw carpetaError;
    if (!carpeta?.id) {
      throw new Error('No se encontro la carpeta solicitada.');
    }

    const { data: imagenesEnCarpeta, error: imagenesEnCarpetaError } = await this.client
      .from('atracciones_imagenes')
      .select('id')
      .eq('atraccion_id', payload.actividad_id)
      .eq('carpeta_id', carpeta.id)
      .limit(1);

    if (imagenesEnCarpetaError) throw imagenesEnCarpetaError;
    if ((imagenesEnCarpeta ?? []).length > 0) {
      throw new Error('La carpeta tiene imagenes. Usa mover o eliminar imagenes antes de borrarla.');
    }

    const { error: eliminarCarpetaError } = await this.client
      .from('atracciones_carpetas')
      .delete()
      .eq('id', carpeta.id)
      .eq('atraccion_id', payload.actividad_id);

    if (eliminarCarpetaError) throw eliminarCarpetaError;

    return { deleted: 1 };
  }

  async eliminarCarpetaConImagenesActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    carpeta_id: number;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      throw new Error('No se encontro el detalle del destino.');
    }

    const { data: actividad, error: actividadError } = await this.client
      .from('atracciones_principales')
      .select('id')
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id)
      .maybeSingle();

    if (actividadError) throw actividadError;
    if (!actividad?.id) {
      throw new Error('No se encontro la actividad solicitada.');
    }

    const { data: carpeta, error: carpetaError } = await this.client
      .from('atracciones_carpetas')
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .eq('id', payload.carpeta_id)
      .eq('atraccion_id', payload.actividad_id)
      .maybeSingle();

    if (carpetaError) throw carpetaError;
    if (!carpeta?.id) {
      throw new Error('No se encontro la carpeta solicitada.');
    }

    const { error: eliminarImagenesError } = await this.client
      .from('atracciones_imagenes')
      .delete()
      .eq('atraccion_id', payload.actividad_id)
      .eq('carpeta_id', carpeta.id);

    if (eliminarImagenesError) throw eliminarImagenesError;

    const { error: eliminarCarpetaError } = await this.client
      .from('atracciones_carpetas')
      .delete()
      .eq('id', carpeta.id)
      .eq('atraccion_id', payload.actividad_id);

    if (eliminarCarpetaError) throw eliminarCarpetaError;

    return { deleted: 1 };
  }

  async moverImagenesCarpetaActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    carpeta_origen_id: number;
    carpeta_destino_id: number;
  }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      throw new Error('No se encontro el detalle del destino.');
    }

    const { data: actividad, error: actividadError } = await this.client
      .from('atracciones_principales')
      .select('id')
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id)
      .maybeSingle();

    if (actividadError) throw actividadError;
    if (!actividad?.id) {
      throw new Error('No se encontro la actividad solicitada.');
    }

    const { data: carpetaOrigen, error: carpetaOrigenError } = await this.client
      .from('atracciones_carpetas')
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .eq('id', payload.carpeta_origen_id)
      .eq('atraccion_id', payload.actividad_id)
      .maybeSingle();

    if (carpetaOrigenError) throw carpetaOrigenError;
    if (!carpetaOrigen?.id) {
      throw new Error('No se encontro la carpeta de origen.');
    }

    const { data: carpetaDestino, error: carpetaDestinoError } = await this.client
      .from('atracciones_carpetas')
      .select('id, atraccion_id, nombre, orden, created_at, updated_at')
      .eq('id', payload.carpeta_destino_id)
      .eq('atraccion_id', payload.actividad_id)
      .maybeSingle();

    if (carpetaDestinoError) throw carpetaDestinoError;
    if (!carpetaDestino?.id) {
      throw new Error('No se encontro la carpeta destino.');
    }

    if (Number(carpetaOrigen.id) === Number(carpetaDestino.id)) {
      return { moved: 0 };
    }

    const { error: moverImagenesError } = await this.client
      .from('atracciones_imagenes')
      .update({
        carpeta_id: carpetaDestino.id,
        carpeta: this.normalizarNombreCarpeta(carpetaDestino.nombre)
      })
      .eq('atraccion_id', payload.actividad_id)
      .eq('carpeta_id', carpetaOrigen.id);

    if (moverImagenesError) throw moverImagenesError;

    return { moved: 1 };
  }

  async administrarCarpetaActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    carpeta_id: number;
    accion: 'delete_empty' | 'delete_images' | 'move_existing' | 'create_and_move';
    carpeta_destino_id?: number | null;
    nueva_carpeta_nombre?: string | null;
  }) {
    const { data, error } = await this.client.rpc('administrar_carpeta_actividad_admin', {
      p_destino_id: payload.destino_id,
      p_actividad_id: payload.actividad_id,
      p_carpeta_id: payload.carpeta_id,
      p_accion: payload.accion,
      p_carpeta_destino_id: payload.carpeta_destino_id ?? null,
      p_nueva_carpeta_nombre: payload.nueva_carpeta_nombre ?? null
    });

    if (error) throw error;
    return data;
  }

  async moverImagenActividadAdmin(payload: {
    destino_id: number;
    actividad_id: number;
    imagen_id: number;
    carpeta_destino_id: number;
  }) {
    const { data, error } = await this.client.rpc('mover_imagen_actividad_admin', {
      p_destino_id: payload.destino_id,
      p_actividad_id: payload.actividad_id,
      p_imagen_id: payload.imagen_id,
      p_carpeta_destino_id: payload.carpeta_destino_id
    });

    if (error) throw error;
    return data;
  }

  async eliminarActividadDestinoAdmin(payload: { destino_id: number; actividad_id: number }) {
    const { data: detalleExistente, error: detalleExistenteError } = await this.client
      .from('detalles_destinos')
      .select('id')
      .eq('destino_id', payload.destino_id)
      .maybeSingle();

    if (detalleExistenteError) throw detalleExistenteError;
    if (!detalleExistente?.id) {
      return { deleted: 0 };
    }

    const { error: borrarTraduccionesError } = await this.client
      .from('atracciones_principales_traducciones')
      .delete()
      .eq('atracciones_principales_id', payload.actividad_id);

    if (borrarTraduccionesError) throw borrarTraduccionesError;

    const { error: borrarActividadError } = await this.client
      .from('atracciones_principales')
      .delete()
      .eq('id', payload.actividad_id)
      .eq('detalles_destino_id', detalleExistente.id);

    if (borrarActividadError) throw borrarActividadError;

    return { deleted: 1 };
  }

  clientsRegister() {
    return this.client
      .from('clientes')
      .select('*')
  }

  async buscarClientes(filtros: {
    nombre?: string | null;
    email?: string | null;
    telefono?: string | null;
  }) {
    let query = this.client
      .from('clientes')
      .select(`
        id,
        nombre,
        nombre_completo,
        tratamiento_id,
        email,
        telefono,
        recibir_ofertas,
        tratamiento:tratamiento_id (
          id,
          nombre,
          abreviacion
        )
      `)
      .order('nombre', { ascending: true })
      .limit(100);

    const nombre = String(filtros?.nombre ?? '').trim();
    const email = String(filtros?.email ?? '').trim();
    const telefono = String(filtros?.telefono ?? '').trim();

    if (nombre) {
      query = query.ilike('nombre', `%${nombre}%`);
    }
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    if (telefono) {
      query = query.ilike('telefono', `%${telefono}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      ...item,
      nombre: construirNombreClienteVisible({
        tratamientoAbreviacion: item?.tratamiento?.abreviacion ?? null,
        nombreCompleto: item?.nombre_completo ?? null,
        nombreFallback: item?.nombre ?? null,
      })
    }));
  }

  async obtenerTratamientosActivos() {
    const { data, error } = await this.client
      .from('tratamientos')
      .select('id, nombre, abreviacion')
      .eq('estatus', true)
      .order('nombre', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async upsertCliente(cliente: {
    nombre: string;
    nombre_completo: string;
    tratamiento_id: number | null;
    email: string | null;
    telefono: string;
    recibir_ofertas: boolean;
  }) {
    const { data, error } = await this.client
      .from('clientes')
      .upsert(cliente, { onConflict: 'telefono' })
      .select(`
        id,
        nombre,
        nombre_completo,
        tratamiento_id,
        email,
        telefono,
        recibir_ofertas,
        tratamiento:tratamiento_id (
          id,
          nombre,
          abreviacion
        )
      `)
      .single();

    if (error) throw error;
    return data; // <- { id, ... }
  }

  async crearSolicitudCotizacion(payload: {
    cliente_id: number;
    hotel_id: number;
    empleado_id: number;
    idioma?: string | null;
    regimen_id?: number | null;
    fecha_entrada: string; // YYYY-MM-DD
    fecha_salida: string;  // YYYY-MM-DD
    noches: number;
    habitaciones: any;     // json
    peticiones_especiales?: string | null;
    recibir_ofertas: boolean;
    mensaje?: string | null;
  }) {
    const { data, error } = await this.client
      .from('solicitudes_cotizacion')
      .insert(payload)
      .select('id, public_id')
      .single();

    if (error) throw error;
    return data; // { id, public_id }
  }

  async guardarCotizacionMultiple(payload: {
    cliente_id: number;
    empleado_id: number;
    nombre_persona: string;
    correo: string | null;
    telefono: string | null;
    destino_id: number;
    fecha_entrada: string;
    fecha_salida: string;
    noches: number;
    total_personas: number;
    total_habitaciones: number;
    habitaciones: any;
    peticiones_especiales: string | null;
    estatus_clave?: string;
    hoteles: Array<{
      hotel_id: number;
      regimen_id: number | null;
      hotel_nombre: string;
      destino_id: number;
      destino_nombre: string;
      orden: number;
      es_principal: boolean;
      precio?: number | null;
      precio_con_seguro?: number | null;
      precio_a_meses?: number | null;
      condiciones_precio?: any[];
      condiciones_precio_seguro?: any[];
      condiciones_precio_meses?: any[];
      porcentaje_seguro?: number | null;
      porcentaje_meses?: number | null;
      fecha_limite_seguro?: string | null;
      fecha_limite_meses?: string | null;
      tipo_tarifa?: string | null;
    }>;
  }) {
    const estatusClave = payload.estatus_clave ?? 'pendiente';

    const { data: cotizacionMultiple, error: errorPadre } = await this.client
      .from('cotizaciones_multiples')
      .insert({
        cliente_id: payload.cliente_id,
        empleado_id: payload.empleado_id,
        nombre_persona: payload.nombre_persona,
        correo: payload.correo,
        telefono: payload.telefono,
        fecha_entrada: payload.fecha_entrada,
        fecha_salida: payload.fecha_salida,
        noches: payload.noches,
        total_personas: payload.total_personas,
        total_habitaciones: payload.total_habitaciones,
        habitaciones: payload.habitaciones,
        peticiones_especiales: payload.peticiones_especiales,
        estatus_clave: estatusClave
      })
      .select('id, public_id')
      .single();

    if (errorPadre) throw errorPadre;

    const solicitudesCotizacion = (payload.hoteles ?? []).map((hotel) => ({
      cliente_id: payload.cliente_id,
      hotel_id: hotel.hotel_id,
      empleado_id: payload.empleado_id,
      regimen_id: hotel.regimen_id,
      fecha_entrada: payload.fecha_entrada,
      fecha_salida: payload.fecha_salida,
      noches: payload.noches,
      habitaciones: payload.habitaciones,
      peticiones_especiales: payload.peticiones_especiales,
      mostrar_en_concentrado: false,
      recibir_ofertas: false,
      mensaje: null,
      precio_cotizacion: hotel.precio ?? null,
      precio_con_seguro: hotel.precio_con_seguro ?? null,
      precio_a_meses: hotel.precio_a_meses ?? null,
      condiciones_precio: hotel.condiciones_precio ?? [],
      condiciones_precio_seguro: hotel.condiciones_precio_seguro ?? [],
      condiciones_precio_meses: hotel.condiciones_precio_meses ?? [],
      porcentaje_seguro: hotel.porcentaje_seguro ?? null,
      porcentaje_meses: hotel.porcentaje_meses ?? null,
      fecha_limite_seguro: hotel.fecha_limite_seguro ?? null,
      fecha_limite_meses: hotel.fecha_limite_meses ?? null,
      cotizacion_multiple: {
        cotizacion_multiple_id: cotizacionMultiple.id,
        orden: hotel.orden,
        es_principal: hotel.es_principal,
        hotel_nombre: hotel.hotel_nombre,
        destino_id: hotel.destino_id,
        destino_nombre: hotel.destino_nombre,
        tipo_tarifa: hotel.tipo_tarifa ?? null
      }
    }));

    if (!solicitudesCotizacion.length) {
      return cotizacionMultiple;
    }

    const { data: solicitudesCreadas, error: errorSolicitudes } = await this.client
      .from('solicitudes_cotizacion')
      .insert(solicitudesCotizacion)
      .select('id');

    if (errorSolicitudes) {
      await this.client
        .from('cotizaciones_multiples')
        .delete()
        .eq('id', cotizacionMultiple.id);
      throw errorSolicitudes;
    }

    const relaciones = (solicitudesCreadas ?? []).map((solicitud: any) => ({
      cotizacion_multiple_id: cotizacionMultiple.id,
      solicitud_cotizacion_id: solicitud.id
    }));

    const { error: errorRelaciones } = await this.client
      .from('cotizaciones_solicitudes')
      .insert(relaciones);

    if (errorRelaciones) {
      const solicitudIds = (solicitudesCreadas ?? []).map((solicitud: any) => solicitud.id);
      if (solicitudIds.length) {
        await this.client
          .from('solicitudes_cotizacion')
          .delete()
          .in('id', solicitudIds);
      }

      await this.client
        .from('cotizaciones_multiples')
        .delete()
        .eq('id', cotizacionMultiple.id);
      throw errorRelaciones;
    }

    return cotizacionMultiple;
  }

  private normalizarSolicitudesCotizacionMultiple(relaciones: any[] | null | undefined) {
    return (relaciones ?? [])
      .map((relacion: any) => {
        const solicitud = relacion?.solicitudes_cotizacion ?? relacion?.solicitud ?? null;
        if (!solicitud) return null;

        const metadata = solicitud?.cotizacion_multiple ?? {};
        const hotel = solicitud?.hotel ?? null;
        const traduccionHotelEs = hotel?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
        const destino = hotel?.destino ?? null;
        const imagenes = Array.isArray(hotel?.imagenes) ? hotel.imagenes : [];
        const imagenPrincipal = imagenes
          .map((imagen: any) => ({
            url_imagen: imagen?.url_imagen ?? '',
            tipo_imagen_id: imagen?.tipo_imagen_id ?? null
          }))
          .filter((imagen: any) => String(imagen.url_imagen ?? '').trim().length > 0)
          [0]?.url_imagen ?? '';

        return {
          ...solicitud,
          hotel_id: hotel?.id ?? solicitud?.hotel_id ?? null,
          hotel_nombre: metadata?.hotel_nombre ?? traduccionHotelEs?.nombre_hotel ?? '',
          destino_id: destino?.id ?? metadata?.destino_id ?? null,
          destino_nombre: destino?.nombre ?? metadata?.destino_nombre ?? '',
          tipo_destino: destino?.tipo_desino_id == null ? '' : Number(destino?.tipo_desino_id) === 2 ? 'INTERNACIONAL' : 'NACIONAL',
          orden: metadata?.orden ?? relacion?.id ?? 0,
          es_principal: Boolean(metadata?.es_principal),
          precio: solicitud?.precio_cotizacion ?? null,
          estrellas: hotel?.estrellas ?? null,
          fondo: hotel?.fondo ?? null,
          imagen_url: hotel?.fondo ?? imagenPrincipal,
          imagenes,
          tipo_tarifa: metadata?.tipo_tarifa ?? null,
          estatus_clave: solicitud?.estatus?.clave ?? solicitud?.estatus_clave ?? 'pendiente',
          estatus_nombre: solicitud?.estatus?.nombre ?? solicitud?.estatus?.clave ?? solicitud?.estatus_clave ?? 'pendiente'
        };
      })
      .filter(Boolean);
  }

  /*
    Cotizaciones multiples se guardan como solicitudes_cotizacion individuales y
    se enlazan con cotizaciones_solicitudes.
  */
  private cotizacionMultipleSolicitudSelect() {
    return `
      id,
      solicitud:solicitud_cotizacion_id (
        id,
        public_id,
        hotel_id,
        regimen_id,
        precio_cotizacion,
        precio_con_seguro,
        precio_a_meses,
        condiciones_precio,
        condiciones_precio_seguro,
        condiciones_precio_meses,
        porcentaje_seguro,
        porcentaje_meses,
        fecha_limite_seguro,
        fecha_limite_meses,
        tipo_habitacion,
        mostrar_en_concentrado,
        cotizacion_multiple,
        created_at,
        hotel:hotel_id (
          id,
          estrellas,
          fondo,
          imagenes:imagenes_hoteles!imagenes_hoteles_hotel_id_fkey (
            url_imagen,
            tipo_imagen_id
          ),
          traducciones:hotel_traducciones (
            idioma_id,
            nombre_hotel
          ),
          destino:destino_id (
            id,
            nombre,
            tipo_desino_id
          )
        ),
        estatus:estatus_id (
          clave,
          nombre
        ),
        regimen:regimen_id (
          id,
          traducciones:regimen_traducciones (
            idioma_id,
            descripcion
          )
        )
      )
    `;
  }

  async agregarHotelACotizacionMultiple(payload: {
    cotizacion_multiple_id: number;
    cliente_id: number;
    empleado_id: number;
    fecha_entrada: string;
    fecha_salida: string;
    noches: number;
    habitaciones: any;
    peticiones_especiales?: string | null;
    hotel: {
      id: number;
      nombre_hotel: string;
      destino_id: number;
      destino_nombre: string;
      regimen_id: number | null;
    };
    orden: number;
  }) {
    const { data: solicitud, error: errorSolicitud } = await this.client
      .from('solicitudes_cotizacion')
      .insert({
        cliente_id: payload.cliente_id,
        hotel_id: payload.hotel.id,
        empleado_id: payload.empleado_id,
        regimen_id: payload.hotel.regimen_id,
        fecha_entrada: payload.fecha_entrada,
        fecha_salida: payload.fecha_salida,
        noches: payload.noches,
        habitaciones: payload.habitaciones,
        peticiones_especiales: payload.peticiones_especiales ?? null,
        mostrar_en_concentrado: false,
        recibir_ofertas: false,
        mensaje: null,
        precio_cotizacion: null,
        precio_con_seguro: null,
        precio_a_meses: null,
        condiciones_precio: [],
        condiciones_precio_seguro: [],
        condiciones_precio_meses: [],
        porcentaje_seguro: null,
        porcentaje_meses: null,
        fecha_limite_seguro: null,
        fecha_limite_meses: null,
        cotizacion_multiple: {
          cotizacion_multiple_id: payload.cotizacion_multiple_id,
          orden: payload.orden,
          es_principal: false,
          hotel_nombre: payload.hotel.nombre_hotel,
          destino_id: payload.hotel.destino_id,
          destino_nombre: payload.hotel.destino_nombre,
          tipo_tarifa: null
        }
      })
      .select('id')
      .single();

    if (errorSolicitud) throw errorSolicitud;

    const { error: errorRelacion } = await this.client
      .from('cotizaciones_solicitudes')
      .insert({
        cotizacion_multiple_id: payload.cotizacion_multiple_id,
        solicitud_cotizacion_id: solicitud.id
      });

    if (errorRelacion) {
      await this.client
        .from('solicitudes_cotizacion')
        .delete()
        .eq('id', solicitud.id);
      throw errorRelacion;
    }

    return solicitud;
  }

  async guardarHotelesComparativaSolicitud(payload: Array<{
    solicitud_id: number;
    hotel_id: number;
    regimen_id: number | null;
    es_principal: boolean;
    orden: number;
  }>) {
    if (!payload?.length) return [];

    const { data, error } = await this.client
      .from('solicitud_cotizacion_hoteles')
      .insert(payload)
      .select('id, solicitud_id, hotel_id, regimen_id, es_principal, orden');

    if (error) throw error;
    return data ?? [];
  }

  async actualizarSolicitudCotizacion(
    id: number,
    payload: {
      estatus_id?: number | null;
      mensaje?: string | null;
    }
  ) {
    const { data, error } = await this.client
      .from('solicitudes_cotizacion')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  async enviarCorreoCotizacion(payload: {
    to_email: string;
    to_name?: string | null;
    hotel_nombre?: string | null;
    asunto?: string | null;
    mensaje?: string | null;
    fecha_entrada?: string | Date | null;
    fecha_salida?: string | Date | null;
    noches?: number | null;
    telefono?: string | null;
    public_id?: string | null;
  }) {
    const toEmail = String(payload?.to_email ?? '').trim();
    if (!toEmail) {
      throw new Error('No hay email de destino.');
    }

    const { data, error } = await this.client.functions.invoke('enviar-correo', {
      body: {
        correo: toEmail,
        nombre: payload?.to_name ?? '',
        hotel: payload?.hotel_nombre ?? '',
        asunto: payload?.asunto ?? null,
        mensaje: payload?.mensaje ?? null,
        fecha_entrada: payload?.fecha_entrada ?? null,
        fecha_salida: payload?.fecha_salida ?? null,
        noches: payload?.noches ?? null,
        telefono: payload?.telefono ?? null,
        public_id: payload?.public_id ?? null
      }
    });

    if (error) {
      throw new Error(error.message ?? 'No se pudo enviar la cotizacion por correo.');
    }

    if ((data as any)?.ok === false) {
      throw new Error((data as any)?.message ?? 'No se pudo enviar la cotizacion por correo.');
    }

    return data;
  }

  addHotel(payload: { nombre: string; ciudad: string; descripcion?: string }) {
    return this.client.from('hoteles').insert(payload).single();
  }

  // ===== REALTIME (DB changes) =====
  subscribeHotelesChanges(handler: (payload: any) => void) {
    const ch = this.client
      .channel('room:hoteles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hoteles' }, handler)
      .subscribe();
    return () => { this.client.removeChannel(ch); };
  }

  // ===== STORAGE =====
  uploadHotelImage(hotelId: string, file: File) {
    const path = `${hotelId}/${Date.now()}_${file.name}`;
    return this.client.storage.from('hoteles').upload(path, file);
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client
      .storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async getIdiomaId(codigo: string) {
    const { data, error } = await this.client
      .from('idiomas')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? 1; // fallback a es=1 si no existe
  }

  async getImagenesFondo() {
    const { data, error } = await this.client
      .from('imagenes_fondo')
      .select('url_imagen, nombre_destino')
      .eq('activo', true)
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  }

  async obtenerTiposImagenHotel() {
    const { data, error } = await this.client
      .from('tipos_imagen')
      .select(`
    id,
    clave,
    orden,
    traducciones:tipos_imagen_traducciones!fk_tipo_imagen (
      id,
      lang,
      descripcion
    )
  `)
      .order('orden');

    return data;
  }

  // getImagenesFondo(): Observable<ImagenFondo[]> {
  // return from(
  //   this.supabase
  //     .from('imagenes_fondo')
  //     .select('id, url_imagen')
  //     .eq('activo', true)
  //     .order('id', { ascending: true })
  // ).pipe(
  //   map(({ data, error }) => {
  //     if (error) throw error;
  //     return data as ImagenFondo[];
  //   })
  // );
  // }

  async obtenerSolicitudesCotizacion() {
    const { data, error } = await this.client
      .rpc('obtener_solicitudes_cotizacion');

    if (error) throw error;

    const solicitudes = (data ?? []) as ISolicitudCotizacionListado[];
    if (!solicitudes.length) {
      return solicitudes;
    }

    const ids = solicitudes
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!ids.length) {
      return solicitudes;
    }

    const { data: detalleHabitaciones, error: errorHabitaciones } = await this.client
      .from('solicitudes_cotizacion')
      .select('id, empleado_id, habitaciones, created_at, mostrar_en_concentrado')
      .in('id', ids);

    if (errorHabitaciones) throw errorHabitaciones;

    const habitacionesPorId = new Map<number, any>(
      (detalleHabitaciones ?? []).map((item: any) => [Number(item.id), item.habitaciones ?? null])
    );
    const empleadoPorId = new Map<number, number | null>(
      (detalleHabitaciones ?? []).map((item: any) => [
        Number(item.id),
        Number.isFinite(Number(item.empleado_id)) ? Number(item.empleado_id) : null,
      ])
    );
    const fechasPorId = new Map<number, string | Date | null>(
      (detalleHabitaciones ?? []).map((item: any) => [Number(item.id), item.created_at ?? null])
    );

    const solicitudesVisibles = solicitudes.filter((item) => {
      const detalle = (detalleHabitaciones ?? []).find((detalleItem: any) => Number(detalleItem.id) === Number(item.id));
      return detalle?.mostrar_en_concentrado !== false;
    });

    return solicitudesVisibles.map((item) => ({
      ...item,
      empleado_id: empleadoPorId.get(Number(item.id)) ?? (item as any).empleado_id ?? null,
      created_at: fechasPorId.get(Number(item.id)) ?? (item as any).created_at ?? null,
      fecha_creacion:
        (item as any).fecha_creacion ??
        fechasPorId.get(Number(item.id)) ??
        (item as any).created_at ??
        null,
      habitaciones: habitacionesPorId.get(Number(item.id)) ?? item.habitaciones ?? null
    }));
  }

  async obtenerCotizacionesMultiples() {
    const { data, error } = await this.client
      .from('cotizaciones_multiples')
      .select(`
        id,
        public_id,
        cliente_id,
        empleado_id,
        nombre_persona,
        correo,
        telefono,
        fecha_entrada,
        fecha_salida,
        noches,
        habitaciones,
        peticiones_especiales,
        estatus_clave,
        created_at,
        updated_at,
        cliente:cliente_id (
          nombre,
          nombre_completo,
          tratamiento_id,
          email,
          telefono,
          tratamiento:tratamiento_id (
            abreviacion
          )
        ),
        empleado:empleado_id (
          nombre
        ),
        cotizaciones_solicitudes (
          ${this.cotizacionMultipleSolicitudSelect()}
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const filas = (data ?? []) as any[];

    return filas.map((item) => {
      const clienteNombre = construirNombreClienteVisible({
        tratamientoAbreviacion: item?.cliente?.tratamiento?.abreviacion ?? null,
        nombreCompleto: item?.cliente?.nombre_completo ?? null,
        nombreFallback: item?.cliente?.nombre ?? item?.nombre_persona ?? null,
      });
      const clienteEmail = item?.cliente?.email ?? item?.correo ?? '';
      const clienteTelefono = item?.cliente?.telefono ?? item?.telefono ?? '';
      const empleadoNombre = item?.empleado?.nombre ?? '';

      const hoteles = this.normalizarSolicitudesCotizacionMultiple(item?.cotizaciones_solicitudes);

      return {
        id: item.id,
        public_id: item.public_id ?? null,
        fecha_creacion: item.created_at ?? null,
        created_at: item.updated_at ?? item.created_at ?? null,
        cliente_nombre: clienteNombre,
        cliente_email: clienteEmail,
        cliente_telefono: clienteTelefono,
        hotel_nombre: '',
        destino_nombre: '',
        tipo_destino: '',
        empleado_nombre: empleadoNombre,
        estatus_nombre: String(item.estatus_clave ?? 'pendiente').trim(),
        habitaciones: item.habitaciones ?? null,
        solicitudes: hoteles
      } as ISolicitudCotizacionListado;
    });
  }

  async obtenerDetalleCotizacionMultiple(publicId: string) {
    const id = String(publicId ?? '').trim();
    if (!id) {
      throw new Error('Public ID invalido.');
    }

    const { data, error } = await this.client
      .from('cotizaciones_multiples')
      .select(`
        id,
        public_id,
        cliente_id,
        empleado_id,
        nombre_persona,
        correo,
        telefono,
        fecha_entrada,
        fecha_salida,
        noches,
        total_personas,
        total_habitaciones,
        habitaciones,
        peticiones_especiales,
        estatus_clave,
        created_at,
        updated_at,
        cliente:cliente_id (
          nombre,
          nombre_completo,
          tratamiento_id,
          email,
          telefono,
          tratamiento:tratamiento_id (
            abreviacion
          )
        ),
        empleado:empleado_id (
          nombre
        ),
        cotizaciones_solicitudes (
          ${this.cotizacionMultipleSolicitudSelect()}
        )
      `)
      .eq('public_id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const item = data as any;
    const hoteles = this.normalizarSolicitudesCotizacionMultiple(item?.cotizaciones_solicitudes)
      .sort((a: any, b: any) => Number(a?.orden ?? 0) - Number(b?.orden ?? 0));
    const hotelesConRegimen = hoteles.map((hotel: any) => {
      const regimenEs = hotel?.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        ...hotel,
        regimen: regimenEs?.descripcion ?? ''
      };
    });

    return {
      ...item,
      cliente_nombre: construirNombreClienteVisible({
        tratamientoAbreviacion: item?.cliente?.tratamiento?.abreviacion ?? null,
        nombreCompleto: item?.cliente?.nombre_completo ?? null,
        nombreFallback: item?.cliente?.nombre ?? item?.nombre_persona ?? null,
      }),
      cliente_email: item?.cliente?.email ?? item?.correo ?? '',
      cliente_telefono: item?.cliente?.telefono ?? item?.telefono ?? '',
      empleado_nombre: item?.empleado?.nombre ?? '',
      destino_nombre: hotelesConRegimen[0]?.destino_nombre ?? '',
      tipo_destino: hotelesConRegimen[0]?.tipo_destino ?? '',
      cotizacion: hotelesConRegimen
    };
  }

  async obtenerCotizacionPorPublicId(publicId: string) {
    const { data, error } = await this.client.rpc(
      'obtener_cotizacion_por_public_id',
      { p_public_id: publicId }
    );
    if (error) throw error;

    return data?.[0] ?? null;
    // TODO: AGREGAR LA IMAGEN DE FONDO DEL DESTINO Y TRAERLA  Y AL TRAER LA INFO MOSTRAR LA DESCRIPCION, 
    // TAMBIEN TRAER EL REGIMEN QUE SE SELECCIONO
  }

  async obtenerCotizacionPorPublicIdCliente(publicId: string) {
    const { data, error } = await this.client.rpc(
      'obtener_cotizacion_por_public_id_cliente',
      { p_public_id: publicId }
    );
    if (error) throw error;

    return data?.[0] ?? null;
    // TODO: AGREGAR LA IMAGEN DE FONDO DEL DESTINO Y TRAERLA  Y AL TRAER LA INFO MOSTRAR LA DESCRIPCION, 
    // TAMBIEN TRAER EL REGIMEN QUE SE SELECCIONO
  }

  tipoHabitaciones() {
    return this.client
      .from('tipos_habitacion')
      .select('*')
  }

  estatusCotizaciones() {
    return this.client
      .from('estatus_cotizacion')
      .select('id, clave, nombre, activo, orden')
      .eq('activo', true); // 👈 ordenados
  }

  async actualizarCotizacionPublicaCompleta(publicId: string, formValue: any) {

    const limpiar = (v: any) => {
      if (!v) return null;
      const n = Number(String(v).replace(/[$,\s]/g, ''));
      return Number.isFinite(n) ? n : null;
    };

    const { error } = await this.client.rpc('actualizar_cotizacion_publica', {

      p_public_id: publicId.trim(),

      p_precio: limpiar(formValue.precio),
      p_precio_con_seguro: limpiar(formValue.precioConSeguro),
      p_precio_a_meses: limpiar(formValue.precioMeses),

      p_tipo_habitacion: formValue.tipoHabitacion?.id,
      p_estatus_clave: formValue.estatus ?? 'pendiente',

      p_condiciones_precio: formValue.condicionesPrecioSinSeguro ?? [],
      p_condiciones_precio_seguro: formValue.condicionesPrecioConSeguro ?? [],
      p_condiciones_precio_meses: formValue.condicionesPrecioMeses ?? [],

      p_porcentaje_seguro: formValue.porcentajeSeguro,
      p_porcentaje_meses: formValue.porcentajeMeses,

      p_fecha_limite_seguro: formValue.fechaLimiteSeguro,
      p_fecha_limite_meses: formValue.fechaLimiteMeses,
      p_cotizacion_multiple: formValue.cotizacionMultiple ?? null

    });

    if (error) throw error;
  }

  async obtenerDetalleDestino(destinoId: number, lang?: string) {
    const { data, error } = await this.client.rpc('get_detalle_destino', {
      p_destino_id: destinoId,
      p_codigo: lang,
    });

    if (error) throw error;

    const respuesta: any = Array.isArray(data) ? [...data] : data ? [data] : [];
    if (!respuesta.length) {
      return data;
    }

    try {
      const previewDestino = await this.obtenerPreviewDestinoAdmin(destinoId);
      const imagenesPorId = new Map<number, string>();

      (previewDestino.actividades ?? []).forEach((actividad) => {
        const actividadId = Number(actividad.id);
        const imagenSeleccionada = actividad.imagen_seleccionada ?? actividad.imagen_fondo ?? '';
        if (actividadId && imagenSeleccionada) {
          imagenesPorId.set(actividadId, imagenSeleccionada);
        }
      });

      respuesta[0] = {
        ...respuesta[0],
        atracciones_principales: (respuesta[0]?.atracciones_principales ?? []).map((actividad: any, index: number) => {
          const actividadId = Number(actividad?.id);
          const imagenPreview =
            (actividadId ? imagenesPorId.get(actividadId) : null) ??
            previewDestino.actividades?.[index]?.imagen_seleccionada ??
            previewDestino.actividades?.[index]?.imagen_fondo ??
            actividad?.imagen_fondo ??
            '';

          return {
            ...actividad,
            imagen_fondo: imagenPreview
          };
        })
      };
    } catch (previewError) {
      console.warn('[obtenerDetalleDestino] No se pudo resolver la galeria del preview:', previewError);
    }

    return respuesta;
  }

  // Admin: devuelve la estructura completa para crear/editar preview
  // con los 5 idiomas (es, en, pt, de, fr), aun si todavia no existe detalle.
  async obtenerDetalleDestinoTodosIdiomas(destinoId: number) {
    return this.obtenerPreviewDestinoAdmin(destinoId);
  }

  async consultarDestinos(): Promise<any> {
    const { data, error } = await this.client
      .rpc('obtener_destinos_con_hoteles', {
        p_tipo_destino: 'TODOS'
      });

    if (error) {
      console.error(error);
      return;
    }

    return data;
  }

  async actualizarOrdenDestinos(
    destinos: Array<{ id: number; orden: number }>
  ) {
    if (!destinos?.length) {
      return [];
    }

    const resultados = await Promise.all(
      destinos.map(({ id, orden }) =>
        this.client
          .from('destinos')
          .update({ orden })
          .eq('id', id)
          .select('id, orden')
          .maybeSingle()
      )
    );

    const error = resultados.find((r) => r.error)?.error;

    if (error) {
      console.error('Error actualizando orden de destinos:', error);
      throw error;
    }

    return resultados
      .map((r) => r.data)
      .filter(Boolean);
  }

  async obtenerDestinosAdmin() {
    const { data, error } = await this.client
      .from('destinos')
      .select('id, nombre, tipo_desino_id, destino_padre_id, continente_id')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async obtenerRegimenesAdmin() {
    const { data, error } = await this.client
      .from('regimen')
      .select(`
        id,
        traducciones:regimen_traducciones (
          idioma_id,
          descripcion
        )
      `)
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      return {
        id: item.id,
        descripcion: traduccionEs?.descripcion ?? `Regimen ${item.id}`
      };
    });
  }

  async obtenerTiposHabitacionAdmin() {
    const { data, error } = await this.client
      .from('tipos_habitacion')
      .select('id, nombre_habitacion, capacidad_maxima, descripcion')
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.id),
      nombre_habitacion: item.nombre_habitacion ?? '',
      capacidad_maxima: item.capacidad_maxima ?? null,
      descripcion: item.descripcion ?? ''
    }));
  }

  async obtenerHotelesAdminPorDestino(destinoId: number) {
    const { data, error } = await this.client
      .from('hoteles')
      .select(`
        id,
        orden,
        regimen_id,
        destino_id,
        traducciones:hotel_traducciones (
          idioma_id,
          nombre_hotel
        ),
        regimen:regimen_id (
          id,
          traducciones:regimen_traducciones (
            idioma_id,
            descripcion
          )
        )
      `)
      .eq('destino_id', destinoId)
      .order('orden', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      const regimenEs = item?.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        id: item.id,
        orden: item.orden ?? null,
        regimen_id: item.regimen_id ?? null,
        destino_id: item.destino_id,
        nombre_hotel: traduccionEs?.nombre_hotel ?? '',
        regimen: regimenEs?.descripcion ?? ''
      };
    });
  }

  async obtenerHotelesAdminPorDestinoPadre(destinoPadreId: number) {
    const { data, error } = await this.client
      .from('hoteles')
      .select(`
        id,
        orden,
        regimen_id,
        destino_id,
        destinos:destino_id!inner (
          destino_padre_id
        ),
        traducciones:hotel_traducciones (
          idioma_id,
          nombre_hotel
        ),
        regimen:regimen_id (
          id,
          traducciones:regimen_traducciones (
            idioma_id,
            descripcion
          )
        )
      `)
      .eq('destinos.destino_padre_id', destinoPadreId)
      .order('orden', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      const regimenEs = item?.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);

      return {
        id: item.id,
        orden: item.orden ?? null,
        regimen_id: item.regimen_id ?? null,
        destino_id: item.destino_id,
        nombre_hotel: traduccionEs?.nombre_hotel ?? '',
        regimen: regimenEs?.descripcion ?? ''
      };
    });
  }

  async obtenerHotelesAdmin() {
    const { data, error } = await this.client
      .from('hoteles')
      .select(`
        id,
        orden,
        regimen_id,
        destino_id,
        destinos:destino_id (
          id,
          nombre,
          destino_padre_id,
          tipo_desino_id
        ),
        traducciones:hotel_traducciones (
          idioma_id,
          nombre_hotel
        ),
        regimen:regimen_id (
          id,
          traducciones:regimen_traducciones (
            idioma_id,
            descripcion
          )
        )
      `)
      .order('orden', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      const regimenEs = item?.regimen?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
      const destino = item?.destinos ?? null;

      return {
        id: item.id,
        orden: item.orden ?? null,
        regimen_id: item.regimen_id ?? null,
        destino_id: item.destino_id,
        destino_nombre: destino?.nombre ?? '',
        tipo_desino_id: destino?.tipo_desino_id ?? null,
        nombre_hotel: traduccionEs?.nombre_hotel ?? '',
        regimen: regimenEs?.descripcion ?? ''
      };
    });
  }

  async actualizarOrdenHoteles(hoteles: Array<{ id: number; orden: number }>) {
    if (!hoteles?.length) {
      return [];
    }

    const payload = hoteles.map(({ id, orden }) => ({ id, orden }));
    const { data, error } = await this.client
      .from('hoteles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, orden');

    if (error) throw error;
    return data ?? [];
  }

  async eliminarHotelAdmin(hotelId: number) {
    if (!Number.isFinite(hotelId)) {
      throw new Error('Hotel invalido para eliminar.');
    }

    const { error: errorRegimenes } = await this.client
      .from('regimen_hotel')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorRegimenes) throw errorRegimenes;

    const { error: errorActividades } = await this.client
      .from('actividades_hotel')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorActividades) throw errorActividades;

    const { error: errorImagenes } = await this.client
      .from('imagenes_hoteles')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorImagenes) throw errorImagenes;

    const { error: errorTraducciones } = await this.client
      .from('hotel_traducciones')
      .delete()
      .eq('hotel_id', hotelId);

    if (errorTraducciones) throw errorTraducciones;

    const { error: errorHotel } = await this.client
      .from('hoteles')
      .delete()
      .eq('id', hotelId);

    if (errorHotel) throw errorHotel;

    return { deleted: 1 };
  }

  async actualizarHotelAdmin(payload: {
    hotelId: number;
    nombre_hotel: string;
    regimen_id: number | null;
    orden: number | null;
  }) {
    const { error: errorHotel } = await this.client
      .from('hoteles')
      .update({
        regimen_id: payload.regimen_id,
        orden: payload.orden
      })
      .eq('id', payload.hotelId);

    if (errorHotel) throw errorHotel;

    const { error: errorTraduccion } = await this.client
      .from('hotel_traducciones')
      .upsert(
        {
          hotel_id: payload.hotelId,
          idioma_id: ES_ID,
          nombre_hotel: payload.nombre_hotel
        },
        { onConflict: 'hotel_id,idioma_id' }
      );

    if (errorTraduccion) throw errorTraduccion;
  }

  async obtenerActividadesAdmin() {
    const { data, error } = await this.client
      .from('actividades')
      .select('id, descripcion, icono, activo, orden')
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.id),
      descripcion: item.descripcion ?? `Actividad ${item.id}`,
      icono: item.icono ?? null,
      activo: item.activo ?? true,
      orden: item.orden ?? null
    }));
  }

  async obtenerDescuentosAdmin() {
    const { data, error } = await this.client
      .from('descuentos')
      .select('id, tipo_descuento, icono')
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.id),
      tipo_descuento: item.tipo_descuento ?? `Descuento ${item.id}`,
      icono: item.icono ?? null
    }));
  }

  async obtenerTiposImagenAdmin() {
    const { data, error } = await this.client
      .from('tipos_imagen')
      .select(`
        id,
        clave,
        orden,
        traducciones:tipos_imagen_traducciones!fk_tipo_imagen (
          lang,
          descripcion
        )
      `)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = item?.traducciones?.find((x: any) => String(x.lang).toLowerCase() === 'es');
      return {
        id: Number(item.id),
        clave: item.clave ?? '',
        descripcion: traduccionEs?.descripcion ?? item.clave ?? `Tipo ${item.id}`,
        orden: item.orden ?? null
      };
    });
  }

  async traducirDesdeEspanol(payload: { title: string; description: string }) {
    const response = await fetch(this.traduccionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        title: payload.title ?? '',
        description: payload.description ?? ''
      })
    });

    if (!response.ok) {
      throw new Error('No se pudo traducir el contenido.');
    }

    const data = await response.json();
    const traducciones = data?.data;
    return traducciones && typeof traducciones === 'object' ? traducciones : {};
  }

  async traducirPoliticaDesdeEspanol(payload: { title: string; description: string }) {
    return this.traducirDesdeEspanol(payload);
  }

  async crearHotelDetalleAdmin(payload: {
    nombre_hotel: string;
    descripcion: string | null;
    orden: number | null;
    estrellas: number | null;
    fondo: string | null;
    ubicacion: string | null;
    destino_id: number;
    descuento_id: number | null;
    regimen_id: number | null;
    regimen_ids: number[];
    actividad_ids: number[];
    imagenes: Array<{
      id?: number | null;
      url_imagen: string;
      tipo_imagen_id: number | null;
      eliminar?: boolean;
    }>;
    traducciones?: Array<{
      idioma_id: number;
      nombre_hotel: string;
      descripcion: string | null;
    }>;
  }) {
    return this.guardarHotelDetalleAdminRpc(null, payload);
  }

  async actualizarHotelDetalleAdmin(payload: {
    hotelId: number;
    nombre_hotel: string;
    descripcion: string | null;
    orden: number | null;
    estrellas: number | null;
    fondo: string | null;
    ubicacion: string | null;
    destino_id: number;
    descuento_id: number | null;
    regimen_id: number | null;
    regimen_ids: number[];
    actividad_ids: number[];
    imagenes: Array<{
      id?: number | null;
      url_imagen: string;
      tipo_imagen_id: number | null;
      eliminar?: boolean;
    }>;
    traducciones?: Array<{
      idioma_id: number;
      nombre_hotel: string;
      descripcion: string | null;
    }>;
  }) {
    const hotelId = Number(payload.hotelId);
    if (!Number.isFinite(hotelId)) {
      throw new Error('Hotel invalido para actualizar.');
    }
    await this.guardarHotelDetalleAdminRpc(hotelId, payload);
  }

  private async guardarHotelDetalleAdminRpc(
    hotelId: number | null,
    payload: {
      nombre_hotel: string;
      descripcion: string | null;
      orden: number | null;
      estrellas: number | null;
      fondo: string | null;
      ubicacion: string | null;
      destino_id: number;
      descuento_id: number | null;
      regimen_id: number | null;
      regimen_ids: number[];
      actividad_ids: number[];
      imagenes: Array<{
        id?: number | null;
        url_imagen: string;
        tipo_imagen_id: number | null;
        eliminar?: boolean;
      }>;
      traducciones?: Array<{
        idioma_id: number;
        nombre_hotel: string;
        descripcion: string | null;
      }>;
    }
  ): Promise<number> {
    const descuentoIdNormalizado =
      payload.descuento_id === null || payload.descuento_id === undefined
        ? null
        : Number(payload.descuento_id);
    const descuentoId = Number.isFinite(descuentoIdNormalizado) ? descuentoIdNormalizado : null;

    const regimenIdNormalizado =
      payload.regimen_id === null || payload.regimen_id === undefined
        ? null
        : Number(payload.regimen_id);
    const regimenId = Number.isFinite(regimenIdNormalizado) ? regimenIdNormalizado : null;

    const regimenesIds = [
      ...new Set(
        (payload.regimen_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ];
    const actividadesIds = [
      ...new Set(
        (payload.actividad_ids ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    ];
    const imagenes = (payload.imagenes ?? [])
      .map((item) => ({
        id: item.id ? Number(item.id) : null,
        url_imagen: (item.url_imagen ?? '').trim(),
        tipo_imagen_id: item.tipo_imagen_id ? Number(item.tipo_imagen_id) : null,
        eliminar: Boolean(item.eliminar)
      }))
      .filter((item) => item.url_imagen.length > 0);

    const traducciones = (payload.traducciones?.length
      ? payload.traducciones
      : [
          {
            idioma_id: ES_ID,
            nombre_hotel: payload.nombre_hotel,
            descripcion: payload.descripcion
          }
        ]
    )
      .map((item) => ({
        idioma_id: Number(item.idioma_id),
        nombre_hotel: (item.nombre_hotel ?? '').trim(),
        descripcion: item.descripcion
      }))
      .filter((item) => Number.isFinite(item.idioma_id) && item.idioma_id > 0 && item.nombre_hotel.length > 0);

    const rpcPayload = {
      nombre_hotel: (payload.nombre_hotel ?? '').trim(),
      descripcion: payload.descripcion,
      orden: payload.orden,
      estrellas: payload.estrellas,
      fondo: payload.fondo,
      ubicacion: payload.ubicacion,
      destino_id: payload.destino_id,
      descuento_id: descuentoId,
      regimen_id: regimenId,
      regimen_ids: regimenesIds,
      actividad_ids: actividadesIds,
      imagenes,
      traducciones
    };

    const { data, error } = await this.client.rpc('guardar_hotel_detalle_admin', {
      p_hotel_id: hotelId,
      p_payload: rpcPayload
    });

    if (error) throw error;    
    const hotelIdGuardado = Number(data.hotel_id);
    if (!Number.isFinite(hotelIdGuardado)) {
      throw new Error('No se pudo guardar el hotel.');
    }

    return hotelIdGuardado;
  }

}

