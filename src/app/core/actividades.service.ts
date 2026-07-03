import { inject, Injectable } from '@angular/core';
import { SupabaseService, IDriveActividadImportImage, IDriveActividadImportFolder } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private readonly supabase = inject(SupabaseService);
  private readonly driveActividadImagenesEndpoint =
    'https://script.google.com/macros/s/AKfycbyJwRo6g4aDbB2Va0739BAMzF2QCUcMu1t4ss9cG2GsbbGC3cK_wpnfD_pOD6x3PTlm/exec';

  private get client() { return this.supabase.getClient(); }

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

  async obtenerActividadesAdmin() {
    const { data, error } = await this.client
      .from('actividades')
      .select('id, descripcion, activo, orden')
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.id),
      descripcion: item.descripcion ?? `Actividad ${item.id}`,
      activo: item.activo ?? true,
      orden: item.orden ?? null
    }));
  }
}
