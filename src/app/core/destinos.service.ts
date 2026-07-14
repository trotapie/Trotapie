import { inject, Injectable } from '@angular/core';
import { SupabaseService, IIdiomaPreviewAdmin, IPreviewDestinoAdmin, IActividadPreviewAdmin, IDetalleRapidoPreviewAdmin, IDriveActividadImportImage, IDriveActividadImportFolder } from './supabase.service';
import { getDefaultLang } from 'app/lang.utils';

const ES_ID = 1;
const CODIGOS_IDIOMA_PREVIEW = ['es', 'en', 'pt', 'de', 'fr'] as const;

export interface RegionCatalogo {
  id: number;
  nombre: string;
  total_paises?: number;
  total_divisiones?: number;
  total_destinos?: number;
}

export interface PaisCatalogo {
  id: number;
  region_id: number;
  nombre: string;
  iso2: string;
  slug?: string;
  total_divisiones?: number;
  total_destinos?: number;
}

export interface DivisionAreaCatalogo {
  id: number;
  pais_id: number;
  nombre: string;
  slug?: string;
  es_fallback?: boolean;
}

export interface DestinoCatalogo {
  id: number;
  pais_id: number;
  division_area_id: number;
  nombre: string;
  slug?: string;
  activo: boolean;
}

export interface CatalogoDestinoLegacyMap {
  legacy_destino_id: number;
  catalogo_destino_id: number | null;
  division_area_id: number | null;
  pais_id: number;
  tipo_origen: 'nacional' | 'internacional';
}

@Injectable({ providedIn: 'root' })
export class DestinosService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.getClient();
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
      .select('id, nombre, orden, imagen_destino, activo, continente:continente_id ( id, nombre )')
      .eq('tipo_desino_id', id)
      .is('destino_padre_id', null)
      .eq('activo', true)
      .order('orden', { ascending: true });
  }

  async obtenerDestinoPorId(id: number) {
    const { data, error } = await this.client
      .from('destinos')
      .select('id, nombre, orden, tipo_desino_id, destino_padre_id, continente_id, imagen_destino, imagen_cotizacion, activo')
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
      activo?: boolean;
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
      activo?: boolean;
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
              oscurecer_fondo,
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
              oscurecer_fondo: Boolean(imagen.oscurecer_fondo),
              orden: imagen.orden ?? null,
              vigencia_desde: imagen.vigencia_desde ?? null,
              vigencia_hasta: imagen.vigencia_hasta ?? null,
              created_at: imagen.created_at ?? null
            };
          })
        );
        const imagenSeleccionada = imagenesOrdenadas.find((imagen: any) => Boolean(imagen.activa)) ?? imagenesOrdenadas[0] ?? null;
        const imagenFondoUrl = imagenSeleccionada?.imagen_url ?? '';
        const imagenFondoId = this.parseNumber(imagenSeleccionada?.id);
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
            oscurecer_fondo: Boolean(imagen.oscurecer_fondo),
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
      const imagenesActivasPorId = new Map<number, Array<{ imagen_url: string; oscurecer_fondo: boolean }>>();

      (previewDestino.actividades ?? []).forEach((actividad) => {
        const actividadId = Number(actividad.id);
        const imagenSeleccionada = actividad.imagen_seleccionada ?? actividad.imagen_fondo ?? '';
        if (actividadId && imagenSeleccionada) {
          imagenesPorId.set(actividadId, imagenSeleccionada);
        }

        if (actividadId) {
          imagenesActivasPorId.set(
            actividadId,
            (actividad.imagenes ?? [])
              .filter((imagen) => imagen.activa && !!imagen.imagen_url)
              .map((imagen) => ({
                imagen_url: imagen.imagen_url,
                oscurecer_fondo: Boolean(imagen.oscurecer_fondo),
              }))
          );
        }
      });

      respuesta[0] = {
        ...respuesta[0],
        atracciones_principales: (respuesta[0]?.atracciones_principales ?? []).map((actividad: any, index: number) => {
          const actividadId = Number(actividad?.id);
          const imagenesActivas =
            (actividadId ? imagenesActivasPorId.get(actividadId) : undefined) ??
            (previewDestino.actividades?.[index]?.imagenes ?? [])
              .filter((imagen) => imagen.activa && !!imagen.imagen_url)
              .map((imagen) => ({
                imagen_url: imagen.imagen_url,
                oscurecer_fondo: Boolean(imagen.oscurecer_fondo),
              }));
          const imagenPreview =
            imagenesActivas[0]?.imagen_url ??
            (actividadId ? imagenesPorId.get(actividadId) : null) ??
            previewDestino.actividades?.[index]?.imagen_seleccionada ??
            previewDestino.actividades?.[index]?.imagen_fondo ??
            actividad?.imagen_fondo ??
            '';

          return {
            ...actividad,
            imagen_fondo: imagenPreview,
            imagenes: imagenesActivas
          };
        })
      };
    } catch (previewError) {
      console.warn('[obtenerDetalleDestino] No se pudo resolver la galeria del preview:', previewError);
    }

    return respuesta;
  }

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
      .select('id, nombre, tipo_desino_id, destino_padre_id, continente_id, activo')
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async obtenerCatalogoNacionalesDivisionAreas(): Promise<DivisionAreaCatalogo[]> {
    const { data, error } = await this.client
      .from('v_catalogo_nacionales_divisiones')
      .select('division_area_id, pais_id, division_area_nombre, division_area_slug, es_fallback')
      .order('division_area_nombre', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.division_area_id),
      pais_id: Number(item.pais_id),
      nombre: String(item.division_area_nombre ?? ''),
      slug: String(item.division_area_slug ?? ''),
      es_fallback: Boolean(item.es_fallback)
    }));
  }

  async obtenerCatalogoInternacionalRegiones(): Promise<RegionCatalogo[]> {
    const { data, error } = await this.client
      .from('v_catalogo_internacional_regiones')
      .select('region_id, region_nombre, total_paises, total_divisiones, total_destinos')
      .order('region_nombre', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.region_id),
      nombre: String(item.region_nombre ?? ''),
      total_paises: Number(item.total_paises ?? 0),
      total_divisiones: Number(item.total_divisiones ?? 0),
      total_destinos: Number(item.total_destinos ?? 0)
    }));
  }

  async obtenerCatalogoInternacionalPaises(regionId?: number | null): Promise<PaisCatalogo[]> {
    let query = this.client
      .from('v_catalogo_internacional_paises')
      .select('region_id, pais_id, pais_nombre, pais_iso2, pais_slug, total_divisiones, total_destinos')
      .order('pais_nombre', { ascending: true });

    if (Number.isFinite(Number(regionId)) && Number(regionId) > 0) {
      query = query.eq('region_id', Number(regionId));
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.pais_id),
      region_id: Number(item.region_id),
      nombre: String(item.pais_nombre ?? ''),
      iso2: String(item.pais_iso2 ?? ''),
      slug: String(item.pais_slug ?? ''),
      total_divisiones: Number(item.total_divisiones ?? 0),
      total_destinos: Number(item.total_destinos ?? 0)
    }));
  }

  async obtenerCatalogoInternacionalDestinosPorPais(paisId: number): Promise<DestinoCatalogo[]> {
    const destinos = await this.obtenerCatalogoInternacionalDestinos();
    return destinos.filter((item) => item.pais_id === paisId);
  }

  async obtenerCatalogoInternacionalDestinos(): Promise<DestinoCatalogo[]> {
    const { data, error } = await this.client
      .from('v_catalogo_internacional_destinos')
      .select('pais_id, division_area_id, destino_id, destino_nombre, destino_slug, activo')
      .order('destino_nombre', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      id: Number(item.destino_id),
      pais_id: Number(item.pais_id),
      division_area_id: Number(item.division_area_id),
      nombre: String(item.destino_nombre ?? ''),
      slug: String(item.destino_slug ?? ''),
      activo: Boolean(item.activo)
    }));
  }

  async resolverLegacyDestinoParaDivisionArea(divisionAreaId: number): Promise<CatalogoDestinoLegacyMap | null> {
    const { data, error } = await this.client
      .from('catalogo_destinos_legacy_map')
      .select('legacy_destino_id, catalogo_destino_id, division_area_id, pais_id, tipo_origen')
      .eq('division_area_id', divisionAreaId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      legacy_destino_id: Number(data.legacy_destino_id),
      catalogo_destino_id: data.catalogo_destino_id ? Number(data.catalogo_destino_id) : null,
      division_area_id: data.division_area_id ? Number(data.division_area_id) : null,
      pais_id: Number(data.pais_id),
      tipo_origen: data.tipo_origen
    };
  }

  async resolverLegacyDestinoParaCatalogoDestino(catalogoDestinoId: number): Promise<CatalogoDestinoLegacyMap | null> {
    const { data, error } = await this.client
      .from('catalogo_destinos_legacy_map')
      .select('legacy_destino_id, catalogo_destino_id, division_area_id, pais_id, tipo_origen')
      .eq('catalogo_destino_id', catalogoDestinoId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      legacy_destino_id: Number(data.legacy_destino_id),
      catalogo_destino_id: data.catalogo_destino_id ? Number(data.catalogo_destino_id) : null,
      division_area_id: data.division_area_id ? Number(data.division_area_id) : null,
      pais_id: Number(data.pais_id),
      tipo_origen: data.tipo_origen
    };
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
      oscurecer_fondo?: boolean;
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
        oscurecer_fondo: Boolean(imagen?.oscurecer_fondo ?? false),
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
            oscurecer_fondo: Boolean(imagen.oscurecer_fondo),
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
          oscurecer_fondo: Boolean(imagen.oscurecer_fondo),
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
}
