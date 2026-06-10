import { inject, Injectable } from '@angular/core';
import { SupabaseService } from 'app/core/supabase.service';

const ES_ID = 1;

export type CatalogoAdminKey =
  | 'actividades'
  | 'conceptos'
  | 'continentes'
  | 'descuentos'
  | 'estatus_empleado'
  | 'estatus_cotizacion'
  | 'idiomas'
  | 'politicas'
  | 'regimen_hotel'
  | 'tarifas'
  | 'tipo_imagen'
  | 'tipos_habitacion'
  | 'atracciones';

export interface IPoliticaTarifaAdmin {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogosAdminService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.getClient();
  }

  async obtenerDetalleCatalogoAtraccionesAdmin(catalogoAtraccionId: number) {
    const { data: catalogo, error: catalogoError } = await this.client
      .from('catalogo_atracciones')
        .select(`
            id,
            clave,
            icono,
            orden,
            activo,
            created_at,
            traducciones:catalogo_atracciones_traducciones (
              idioma:idiomas(codigo),
              nombre,
              descripcion
            )
          `)
      .eq('id', catalogoAtraccionId)
      .maybeSingle();

    if (catalogoError) throw catalogoError;
    if (!catalogo) throw new Error('No se encontro el catalogo de atracciones solicitado.');

    const { data: atracciones, error: atraccionesError } = await this.client
      .from('atracciones')
      .select(`
        id,
        catalogo_atraccion_id,
        imagen_fondo,
        orden,
        activo,
        created_at,
        imagenes:atracciones_imagenes (
          id,
          imagen_url,
          activa,
          orden,
          created_at
        ),
        traducciones:atracciones_traducciones (
          idioma_id,
          nombre,
          descripcion
        )
      `)
      .eq('catalogo_atraccion_id', catalogoAtraccionId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (atraccionesError) throw atraccionesError;

    const traduccionCatalogoEs = catalogo?.traducciones?.find((x: any) => Number(x.idioma_id) === ES_ID);

    return {
      catalogo: {
        id: catalogo.id,
        clave: catalogo.clave ?? '',
        icono: catalogo.icono ?? '',
        orden: catalogo.orden ?? null,
        activo: Boolean(catalogo.activo),
        created_at: catalogo.created_at ?? null,
        nombre: traduccionCatalogoEs?.nombre ?? '',
        descripcion: traduccionCatalogoEs?.descripcion ?? ''
      },
      atracciones: (atracciones ?? []).map((item: any) => {
        const traduccionEs = item?.traducciones?.find((x: any) => Number(x.idioma_id) === ES_ID);
        const imagenesOrdenadas = [...(item?.imagenes ?? [])].sort((a: any, b: any) => {
          const ordenA = a?.orden ?? Number.MAX_SAFE_INTEGER;
          const ordenB = b?.orden ?? Number.MAX_SAFE_INTEGER;
          if (ordenA !== ordenB) {
            return ordenA - ordenB;
          }
          return Number(a?.id ?? 0) - Number(b?.id ?? 0);
        });

        const imagenActiva = imagenesOrdenadas.find((imagen: any) => Boolean(imagen?.activa));
        return {
          id: item.id,
          imagen_fondo: imagenActiva?.imagen_url ?? item.imagen_fondo ?? '',
          imagenes: imagenesOrdenadas.map((imagen: any) => ({
            id: imagen.id,
            imagen_url: imagen.imagen_url ?? '',
            activa: Boolean(imagen.activa),
            orden: imagen.orden ?? null,
            created_at: imagen.created_at ?? null
          })),
          orden: item.orden ?? null,
          activo: Boolean(item.activo),
          created_at: item.created_at ?? null,
          nombre: traduccionEs?.nombre ?? '',
          descripcion: traduccionEs?.descripcion ?? ''
        };
      })
    };
  }

  async actualizarRegistroCatalogoAtraccionAdmin(payload: {
    atraccion_id: number;
    nombre: string | null;
    descripcion: string | null;
    orden: number | null;
    activo: boolean;
  }) {
    const { data: updatedAtraccion, error: atraccionError } = await this.client
      .from('atracciones')
      .update({
        orden: payload.orden,
        activo: payload.activo
      })
      .eq('id', payload.atraccion_id)
      .select('id')
      .maybeSingle();

    if (atraccionError) throw atraccionError;
    if (!updatedAtraccion?.id) {
      throw new Error('No se encontro la atraccion a actualizar.');
    }

    const { error: traduccionError } = await this.client
      .from('atracciones_traducciones')
      .upsert(
        {
          atraccion_id: payload.atraccion_id,
          idioma_id: ES_ID,
          nombre: payload.nombre ?? '',
          descripcion: payload.descripcion ?? ''
        },
        { onConflict: 'atraccion_id,idioma_id' }
      );

    if (traduccionError) throw traduccionError;
    return { id: payload.atraccion_id };
  }

  async obtenerCatalogoAdmin(catalogo: CatalogoAdminKey): Promise<any[]> {
    switch (catalogo) {
      case 'actividades': {
        const { data, error } = await this.client
          .from('actividades')
          .select(`
            id,
            descripcion,
            clave,
            activo,
            orden,
            traducciones:actividades_traducciones (
              idioma:idiomas(codigo),
              descripcion
            )
          `)
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((item: any) => ({
          ...item,
          traducciones_preview: (item.traducciones ?? []).reduce((acc: any, t: any) => {
            const code = t.idioma?.codigo;
            if (code) {
              acc[code] = { descripcion: t.descripcion };
            }
            return acc;
          }, {})
        }));
      }
      case 'conceptos': {
        const { data, error } = await this.client
          .from('conceptos')
          .select('id, descripcion, icono')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'continentes': {
        const { data, error } = await this.client
          .from('continentes')
          .select('id, nombre')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'descuentos': {
        const { data, error } = await this.client
          .from('descuentos')
          .select(`
            id,
            tipo_descuento,
            icono,
            traducciones:descuentos_traducciones (
              idioma:idiomas(codigo),
              descripcion
            )
          `)
          .order('id', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((item: any) => ({
          ...item,
          traducciones_preview: (item?.traducciones ?? []).reduce((acc: Record<string, any>, traduccion: any) => {
            const code = String(traduccion?.idioma?.codigo ?? '').toLowerCase();
            if (!code) {
              return acc;
            }

            acc[code] = {
              descripcion: traduccion?.descripcion ?? ''
            };

            return acc;
          }, {})
        }));
      }
      case 'estatus_empleado': {
        const { data, error } = await this.client
          .from('estatus_empleado')
          .select('id, clave, nombre, activo, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'estatus_cotizacion': {
        const { data, error } = await this.client
          .from('estatus_cotizacion')
          .select('id, clave, nombre, activo, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'idiomas': {
        const { data, error } = await this.client
          .from('idiomas')
          .select('id, codigo, nombre, activo, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'politicas': {
        const { data, error } = await this.client
          .from('politicas')
          .select(`
            id,
            codigo,
            categoria,
            activo,
            created_at,
            traducciones:politicas_traducciones (
              idioma,
              titulo,
              descripcion
            )
          `)
          .order('id', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((item: any) => {
          const traduccionEs = item?.traducciones?.find((x: any) => String(x.idioma ?? '').toLowerCase() === 'es');
          const traduccionesPreview = (item?.traducciones ?? []).reduce((acc: Record<string, any>, traduccion: any) => {
            const idioma = String(traduccion?.idioma ?? '').toLowerCase();
            if (!idioma) {
              return acc;
            }

            acc[idioma] = {
              titulo: traduccion?.titulo ?? '',
              descripcion: traduccion?.descripcion ?? ''
            };

            return acc;
          }, {});

          return {
            id: item.id,
            codigo: item.codigo,
            categoria: item.categoria,
            activo: item.activo,
            created_at: item.created_at,
            titulo_es: traduccionEs?.titulo ?? traduccionEs?.nombre ?? traduccionEs?.title ?? '',
            descripcion_es: traduccionEs?.descripcion ?? '',
            traducciones_preview: traduccionesPreview
          };
        });
      }
      case 'regimen_hotel': {
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
      case 'tarifas': {
        const { data, error } = await this.client
          .from('tarifas')
          .select(`
            id,
            clave,
            nombre,
            activo,
            created_at,
            politicas:tarifas_politicas (
              id,
              orden,
              politica:politicas (
                id,
                codigo,
                categoria,
                activo,
                traducciones:politicas_traducciones (
                  idioma,
                  titulo,
                  descripcion
                )
              )
            )
          `)
          .order('id', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((item: any) => ({
          id: item.id,
          clave: item.clave,
          nombre: item.nombre,
          activo: item.activo,
          created_at: item.created_at,
          politicas: (item?.politicas ?? [])
            .map((relacion: any) => {
              const politica = relacion?.politica;
              const traduccionEs = politica?.traducciones?.find(
                (traduccion: any) => String(traduccion?.idioma ?? '').toLowerCase() === 'es'
              );

              return {
                id: politica?.id,
                relacion_id: relacion?.id,
                orden: relacion?.orden ?? null,
                codigo: politica?.codigo ?? '',
                categoria: politica?.categoria ?? '',
                activo: Boolean(politica?.activo),
                titulo: traduccionEs?.titulo ?? '',
                descripcion: traduccionEs?.descripcion ?? ''
              };
            })
            .filter((politica: any) => Number.isFinite(Number(politica.id)))
            .sort((a: any, b: any) => Number(a.orden ?? 0) - Number(b.orden ?? 0))
        }));
      }
      case 'tipo_imagen': {
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
          const traduccionEs = (item?.traducciones ?? []).find(
            (traduccion: any) => String(traduccion?.lang ?? '').toLowerCase() === 'es'
          );

          const traduccionesPreview = (item?.traducciones ?? []).reduce((acc: Record<string, any>, traduccion: any) => {
            const lang = String(traduccion?.lang ?? '').toLowerCase();
            if (!lang) {
              return acc;
            }

            acc[lang] = {
              descripcion: traduccion?.descripcion ?? ''
            };

            return acc;
          }, {});

          return {
            id: item.id,
            clave: item.clave ?? '',
            descripcion: traduccionEs?.descripcion ?? item.clave ?? `Tipo ${item.id}`,
            orden: item.orden ?? null,
            traducciones_preview: traduccionesPreview
          };
        });
      }
      case 'tipos_habitacion': {
        const { data, error } = await this.client
          .from('tipos_habitacion')
          .select('id, nombre_habitacion, capacidad_maxima, descripcion')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'atracciones': {
        const { data, error } = await this.client
          .from('catalogo_atracciones')
          .select(`
            id,
            clave,
            icono,
            orden,
            activo,
            created_at,
            traducciones:catalogo_atracciones_traducciones (
              idioma_id,
              nombre,
              descripcion
            )
          `)
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        const { data: atraccionesRows, error: atraccionesError } = await this.client
          .from('atracciones')
          .select('id, catalogo_atraccion_id')
          .eq('activo', true);
        if (atraccionesError) throw atraccionesError;

        const conteoPorCatalogo = new Map<number, number>();
        (atraccionesRows ?? []).forEach((row: any) => {
          const key = Number(row.catalogo_atraccion_id);
          conteoPorCatalogo.set(key, (conteoPorCatalogo.get(key) ?? 0) + 1);
        });

        return (data ?? []).map((item: any) => {
          const traduccionEs = item?.traducciones?.find((x: any) => String(x?.idioma?.codigo ?? '').toLowerCase() === 'es');
          return {
            id: item.id,
            clave: item.clave,
            icono: item.icono,
            orden: item.orden,
            activo: item.activo,
            created_at: item.created_at,
            nombre: traduccionEs?.nombre ?? '',
            descripcion: traduccionEs?.descripcion ?? '',
            traducciones_preview: (item?.traducciones ?? []).reduce((acc: Record<string, any>, traduccion: any) => {
              const code = String(traduccion?.idioma?.codigo ?? '').toLowerCase();
              if (!code) {
                return acc;
              }

              acc[code] = {
                nombre: traduccion?.nombre ?? '',
                descripcion: traduccion?.descripcion ?? ''
              };

              return acc;
            }, {}),
            total_registros: conteoPorCatalogo.get(Number(item.id)) ?? 0
          };
        });
      }
      default:
        return [];
    }
  }

  async actualizarOrdenCatalogoAdmin(
    catalogo: CatalogoAdminKey,
    registros: Array<{ id: number; orden: number }>
  ) {
    if (!registros?.length) {
      return [];
    }

    const tablaPorCatalogo: Record<CatalogoAdminKey, string | null> = {
      actividades: 'actividades',
      conceptos: null,
      continentes: null,
      descuentos: null,
      estatus_empleado: 'estatus_empleado',
      estatus_cotizacion: 'estatus_cotizacion',
      idiomas: 'idiomas',
      politicas: null,
      regimen_hotel: null,
      tarifas: null,
      tipo_imagen: 'tipos_imagen',
      tipos_habitacion: null,
      atracciones: 'catalogo_atracciones'
    };

    const tabla = tablaPorCatalogo[catalogo];
    if (!tabla) {
      throw new Error('Este catalogo no admite orden manual.');
    }

    const resultados = await Promise.all(
      registros.map(({ id, orden }) =>
        this.client
          .from(tabla)
          .update({ orden })
          .eq('id', id)
          .select('id, orden')
          .maybeSingle()
      )
    );

    const error = resultados.find((r) => r.error)?.error;
    if (error) throw error;

    return resultados.map((r) => r.data).filter(Boolean);
  }

  async crearCatalogoAdmin(catalogo: CatalogoAdminKey, payload: Record<string, any>) {
    switch (catalogo) {
      case 'actividades': {
        const { data: ultimoRegistro, error: ultimoError } = await this.client
          .from('actividades')
          .select('orden')
          .order('orden', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ultimoError) throw ultimoError;

        const ordenMaximo = Number((ultimoRegistro as any)?.orden);
        const siguienteOrden = Number.isFinite(ordenMaximo) ? ordenMaximo + 1 : 1;

        const { data, error } = await this.client
          .from('actividades')
          .insert({
            descripcion: payload.descripcion ?? null,
            clave: payload.clave ?? null,
            activo: payload.activo ?? true,
            orden: siguienteOrden
          })
          .select('id, descripcion, clave, activo, orden')
          .single();

        if (error) throw error;
        await this.guardarTraduccionesActividad(Number((data as any).id), payload.descripcion ?? '');
        return data;
      }
      case 'continentes': {
        const { data, error } = await this.client
          .from('continentes')
          .insert({
            nombre: payload.nombre ?? null
          })
          .select('id, nombre')
          .single();
        if (error) throw error;
        return data;
      }
      case 'conceptos': {
        const { data, error } = await this.client
          .from('conceptos')
          .insert({
            descripcion: payload.descripcion ?? null,
            icono: payload.icono ?? null
          })
          .select('id, descripcion, icono')
          .single();
        if (error) throw error;
        return data;
      }
      case 'descuentos': {
        const { data, error } = await this.client
          .from('descuentos')
          .insert({
            tipo_descuento: payload.tipo_descuento ?? null,
            icono: payload.icono ?? null
          })
          .select('id, tipo_descuento, icono')
          .single();
        if (error) throw error;
        await this.guardarTraduccionesDescuento(Number((data as any).id), payload.tipo_descuento ?? '');
        return data;
      }
      case 'idiomas': {
        const { data: ultimoRegistro, error: ultimoError } = await this.client
          .from('idiomas')
          .select('orden')
          .order('orden', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ultimoError) throw ultimoError;

        const ordenMaximo = Number(ultimoRegistro?.orden);
        const siguienteOrden = Number.isFinite(ordenMaximo) ? ordenMaximo + 1 : 1;

        const { data, error } = await this.client
          .from('idiomas')
          .insert({
            codigo: payload.codigo ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? true,
            orden: siguienteOrden
          })
          .select('id, codigo, nombre, activo, orden')
          .single();

        if (error) throw error;
        return data;
      }
      case 'politicas': {
        const { data, error } = await this.client
          .from('politicas')
          .insert({
            codigo: payload.codigo ?? null,
            categoria: payload.categoria ?? null,
            activo: payload.activo ?? true
          })
          .select('id, codigo, categoria, activo, created_at')
          .single();

        if (error) throw error;
        await this.guardarTraduccionesPolitica(Number(data.id), {
          titulo: String(payload.titulo_es ?? '').trim(),
          descripcion: String(payload.descripcion_es ?? '').trim()
        });
        return data;
      }
      case 'tarifas': {
        const { data, error } = await this.client
          .from('tarifas')
          .insert({
            clave: payload.clave ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? true
          })
          .select('id, clave, nombre, activo, created_at')
          .single();

        if (error) throw error;
        await this.guardarRelacionesTarifaPoliticas(
          Number(data.id),
          Array.isArray(payload.politica_ids) ? payload.politica_ids : []
        );
        return data;
      }
      case 'tipos_habitacion': {
        const { data, error } = await this.client
          .from('tipos_habitacion')
          .insert({
            nombre_habitacion: payload.nombre_habitacion ?? null,
            capacidad_maxima: payload.capacidad_maxima ?? null,
            descripcion: payload.descripcion ?? null
          })
          .select('id, nombre_habitacion, capacidad_maxima, descripcion')
          .single();

        if (error) throw error;
        return data;
      }
      case 'atracciones': {
        const orden = Number(payload.orden);
        const ordenFinal = Number.isFinite(orden) && orden > 0 ? orden : null;

        const { data, error } = await this.client
          .from('catalogo_atracciones')
          .insert({
            clave: payload.clave ?? null,
            icono: payload.icono ?? null,
            activo: payload.activo ?? true,
            orden: ordenFinal
          })
          .select('id, clave, icono, activo, orden')
          .single();

        if (error) throw error;
        await this.guardarTraduccionesCatalogoAtraccion(
          Number((data as any).id),
          String(payload.nombre ?? '').trim(),
          String(payload.descripcion ?? '').trim()
        );
        return data;
      }
      case 'tipo_imagen': {
        const { data: ultimoRegistro, error: ultimoError } = await this.client
          .from('tipos_imagen')
          .select('orden')
          .order('orden', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ultimoError) throw ultimoError;

        const ordenMaximo = Number((ultimoRegistro as any)?.orden);
        const siguienteOrden = Number.isFinite(ordenMaximo) ? ordenMaximo + 1 : 1;

        const { data, error } = await this.client
          .from('tipos_imagen')
          .insert({
            clave: payload.clave ?? null,
            orden: siguienteOrden
          })
          .select('id, clave, orden')
          .single();

        if (error) throw error;
        await this.guardarTraduccionesTipoImagen(Number((data as any).id), String(payload.descripcion_es ?? '').trim());
        return data;
      }
      default:
        throw new Error('Este catalogo no admite creacion desde esta pantalla.');
    }
  }

  async obtenerPoliticasDisponiblesTarifa(): Promise<IPoliticaTarifaAdmin[]> {
    const { data, error } = await this.client
      .from('politicas')
      .select(`
        id,
        codigo,
        activo,
        traducciones:politicas_traducciones (
          idioma,
          titulo,
          descripcion
        )
      `)
      .eq('activo', true)
      .order('id', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((item: any) => {
      const traduccionEs = (item?.traducciones ?? []).find(
        (traduccion: any) => String(traduccion?.idioma ?? '').toLowerCase() === 'es'
      );

      return {
        id: Number(item.id),
        codigo: item.codigo ?? '',
        titulo: traduccionEs?.titulo ?? item.codigo ?? '',
        descripcion: traduccionEs?.descripcion ?? '',
        activo: Boolean(item.activo)
      };
    });
  }

  async eliminarCatalogoAdmin(catalogo: CatalogoAdminKey, id: number) {
    switch (catalogo) {
      case 'actividades': {
        const { error } = await this.client
          .from('actividades')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'conceptos': {
        const { error } = await this.client
          .from('conceptos')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'continentes': {
        const { error } = await this.client
          .from('continentes')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'descuentos': {
        const { error: deleteTraduccionesError } = await this.client
          .from('descuentos_traducciones')
          .delete()
          .eq('descuento_id', id);
        if (deleteTraduccionesError) throw deleteTraduccionesError;

        const { error } = await this.client
          .from('descuentos')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'tipo_imagen': {
        const { error: deleteTraduccionesError } = await this.client
          .from('tipos_imagen_traducciones')
          .delete()
          .eq('tipo_imagen_id', id);
        if (deleteTraduccionesError) throw deleteTraduccionesError;

        const { error } = await this.client
          .from('tipos_imagen')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'idiomas': {
        const { error } = await this.client
          .from('idiomas')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'politicas': {
        const { error } = await this.client
          .from('politicas')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'tarifas': {
        const { error: deleteRelacionError } = await this.client
          .from('tarifas_politicas')
          .delete()
          .eq('tarifa_id', id);
        if (deleteRelacionError) throw deleteRelacionError;

        const { error } = await this.client
          .from('tarifas')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'tipos_habitacion': {
        const { error } = await this.client
          .from('tipos_habitacion')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      case 'atracciones': {
        const { error: deleteTraduccionesError } = await this.client
          .from('catalogo_atracciones_traducciones')
          .delete()
          .eq('catalogo_atraccion_id', id);
        if (deleteTraduccionesError) throw deleteTraduccionesError;

        const { error } = await this.client
          .from('catalogo_atracciones')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return { deleted: 1 };
      }
      default:
        throw new Error('Este catalogo no admite eliminacion desde esta pantalla.');
    }
  }

  async actualizarCatalogoAdmin(
    catalogo: CatalogoAdminKey,
    id: number,
    payload: Record<string, any>
  ) {
    switch (catalogo) {
      case 'actividades': {
        const { data, error } = await this.client
          .from('actividades')
          .update({
            descripcion: payload.descripcion ?? null,
            clave: payload.clave ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        await this.guardarTraduccionesActividad(id, payload.descripcion ?? '');
        return data;
      }
      case 'conceptos': {
        const { data, error } = await this.client
          .from('conceptos')
          .update({
            descripcion: payload.descripcion ?? null,
            icono: payload.icono ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'continentes': {
        const { data, error } = await this.client
          .from('continentes')
          .update({
            nombre: payload.nombre ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'descuentos': {
        const { data, error } = await this.client
          .from('descuentos')
          .update({
            tipo_descuento: payload.tipo_descuento ?? null,
            icono: payload.icono ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        await this.guardarTraduccionesDescuento(id, payload.tipo_descuento ?? '');
        return data;
      }
      case 'estatus_empleado': {
        const { data, error } = await this.client
          .from('estatus_empleado')
          .update({
            clave: payload.clave ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'estatus_cotizacion': {
        const { data, error } = await this.client
          .from('estatus_cotizacion')
          .update({
            clave: payload.clave ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'idiomas': {
        const { data, error } = await this.client
          .from('idiomas')
          .update({
            codigo: payload.codigo ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'politicas': {
        const { data, error } = await this.client
          .from('politicas')
          .update({
            codigo: payload.codigo ?? null,
            categoria: payload.categoria ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        await this.guardarTraduccionesPolitica(id, {
          titulo: String(payload.titulo_es ?? '').trim(),
          descripcion: String(payload.descripcion_es ?? '').trim()
        });
        return data;
      }
      case 'regimen_hotel': {
        const { data, error } = await this.client
          .from('regimen_traducciones')
          .upsert(
            {
              regimen_id: id,
              idioma_id: ES_ID,
              descripcion: payload.descripcion ?? ''
            },
            { onConflict: 'regimen_id,idioma_id' }
          )
          .select('regimen_id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'tarifas': {
        const { data, error } = await this.client
          .from('tarifas')
          .update({
            clave: payload.clave ?? null,
            nombre: payload.nombre ?? null,
            activo: payload.activo ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        await this.guardarRelacionesTarifaPoliticas(
          id,
          Array.isArray(payload.politica_ids) ? payload.politica_ids : []
        );
        return data;
      }
      case 'tipo_imagen': {
        const { data, error } = await this.client
          .from('tipos_imagen')
          .update({
            clave: payload.clave ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        await this.guardarTraduccionesTipoImagen(id, String(payload.descripcion_es ?? '').trim());
        return data;
      }
      case 'tipos_habitacion': {
        const { data, error } = await this.client
          .from('tipos_habitacion')
          .update({
            nombre_habitacion: payload.nombre_habitacion ?? null,
            capacidad_maxima: payload.capacidad_maxima ?? null,
            descripcion: payload.descripcion ?? null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      case 'atracciones': {
        const { data, error } = await this.client
          .from('catalogo_atracciones')
          .update({
            clave: payload.clave ?? null,
            icono: payload.icono ?? null,
            activo: payload.activo ?? null,
            orden: Number.isFinite(Number(payload.orden)) ? Number(payload.orden) : null
          })
          .eq('id', id)
          .select('id')
          .maybeSingle();
        if (error) throw error;

        const { error: traduccionError } = await this.client
          .from('catalogo_atracciones_traducciones')
          .upsert(
            {
              catalogo_atraccion_id: id,
              idioma_id: ES_ID,
              nombre: payload.nombre ?? '',
              descripcion: payload.descripcion ?? ''
            },
            { onConflict: 'catalogo_atraccion_id,idioma_id' }
          );

        if (traduccionError) throw traduccionError;
        return data;
      }
      default:
        return null;
    }
  }

  private async guardarTraduccionesPolitica(
    politicaId: number,
    payload: { titulo: string; descripcion: string }
  ) {
    const titulo = String(payload.titulo ?? '').trim();
    const descripcion = String(payload.descripcion ?? '').trim();

    if (!titulo) {
      return;
    }

    const traducciones = await this.supabase.traducirPoliticaDesdeEspanol({
      title: titulo,
      description: descripcion
    });

    const traduccionesPayload = Object.entries(traducciones ?? {})
      .map(([idioma, valor]: [string, any]) => ({
        politica_id: politicaId,
        idioma: String(idioma).toLowerCase(),
        titulo:
          String(idioma).toLowerCase() === 'es'
            ? titulo
            : typeof valor?.title === 'string'
              ? valor.title
              : '',
        descripcion:
          String(idioma).toLowerCase() === 'es'
            ? descripcion
            : typeof valor?.description === 'string'
              ? valor.description
              : ''
      }))
      .filter((item) => item.idioma.length > 0);

    if (!traduccionesPayload.some((item) => item.idioma === 'es')) {
      traduccionesPayload.push({
        politica_id: politicaId,
        idioma: 'es',
        titulo,
        descripcion
      });
    }

    if (!traduccionesPayload.length) {
      traduccionesPayload.push({
        politica_id: politicaId,
        idioma: 'es',
        titulo,
        descripcion
      });
    }

    const { error } = await this.client
      .from('politicas_traducciones')
      .upsert(traduccionesPayload, { onConflict: 'politica_id,idioma' });

    if (error) throw error;
  }

  private async guardarRelacionesTarifaPoliticas(tarifaId: number, politicaIds: number[]) {
    const ids = [...new Set(
      (politicaIds ?? [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    )];

    const { error: deleteError } = await this.client
      .from('tarifas_politicas')
      .delete()
      .eq('tarifa_id', tarifaId);

    if (deleteError) throw deleteError;

    if (!ids.length) {
      return;
    }

    const payload = ids.map((politicaId, index) => ({
      tarifa_id: tarifaId,
      politica_id: politicaId,
      orden: index + 1
    }));

    const { error: insertError } = await this.client
      .from('tarifas_politicas')
      .insert(payload);

    if (insertError) throw insertError;
  }

  private async guardarTraduccionesActividad(actividadId: number, descripcion: string) {
    const desc = String(descripcion ?? '').trim();
    if (!desc) {
      return;
    }

    const traducciones = await this.supabase.traducirDesdeEspanol({
      title: '',
      description: desc
    });

    const idiomasDisponibles = await this.supabase.obtenerIdiomasPreviewAdmin();
    const mapaIdiomas = new Map(idiomasDisponibles.map((i) => [i.codigo.toLowerCase(), i.id]));

    const traduccionesPayload = Object.entries(traducciones ?? {})
      .map(([idioma, valor]: [string, any]) => {
        const idiomaId = mapaIdiomas.get(idioma.toLowerCase());
        if (!idiomaId) {
          return null;
        }

        return {
          actividad_id: actividadId,
          idioma_id: idiomaId,
          descripcion: typeof valor?.description === 'string' ? valor.description : ''
        };
      })
      .filter((item) => item !== null);

    // Asegurar que el espanol este presente
    const esId = mapaIdiomas.get('es') || ES_ID;
    if (!traduccionesPayload.some((item) => item!.idioma_id === esId)) {
      traduccionesPayload.push({
        actividad_id: actividadId,
        idioma_id: esId,
        descripcion: desc
      });
    }

    const { error } = await this.client
      .from('actividades_traducciones')
      .upsert(traduccionesPayload, { onConflict: 'actividad_id,idioma_id' });

    if (error) throw error;
  }

  private async guardarTraduccionesDescuento(descuentoId: number, tipoDescuento: string) {
    const texto = String(tipoDescuento ?? '').trim();
    if (!texto) {
      return;
    }

    const traducciones = await this.supabase.traducirDesdeEspanol({
      title: '',
      description: texto
    });

    const idiomasDisponibles = await this.supabase.obtenerIdiomasPreviewAdmin();
    const mapaIdiomas = new Map(idiomasDisponibles.map((i) => [i.codigo.toLowerCase(), i.id]));

    const traduccionesPayload = Object.entries(traducciones ?? {})
      .map(([idioma, valor]: [string, any]) => {
        const idiomaId = mapaIdiomas.get(idioma.toLowerCase());
        if (!idiomaId) {
          return null;
        }

        return {
          descuento_id: descuentoId,
          idioma_id: idiomaId,
          descripcion: typeof valor?.description === 'string' ? valor.description : ''
        };
      })
      .filter((item) => item !== null);

    const esId = mapaIdiomas.get('es') || ES_ID;
    if (!traduccionesPayload.some((item) => item!.idioma_id === esId)) {
      traduccionesPayload.push({
        descuento_id: descuentoId,
        idioma_id: esId,
        descripcion: texto
      });
    }

    const { error } = await this.client
      .from('descuentos_traducciones')
      .upsert(traduccionesPayload, { onConflict: 'descuento_id,idioma_id' });

    if (error) throw error;
  }

  private async guardarTraduccionesTipoImagen(tipoImagenId: number, descripcion: string) {
    const texto = String(descripcion ?? '').trim();
    if (!texto) {
      return;
    }

    const traducciones = await this.supabase.traducirDesdeEspanol({
      title: '',
      description: texto
    });

    const traduccionesPayload = Object.entries(traducciones ?? {})
      .map(([idioma, valor]: [string, any]) => {
        const lang = String(idioma).toLowerCase();
        if (!lang) {
          return null;
        }

        return {
          tipo_imagen_id: tipoImagenId,
          lang,
          descripcion: lang === 'es' ? texto : typeof valor?.description === 'string' ? valor.description : ''
        };
      })
      .filter((item) => item !== null);

    const esIdioma = 'es';
    if (!traduccionesPayload.some((item) => item!.lang === esIdioma)) {
      traduccionesPayload.push({
        tipo_imagen_id: tipoImagenId,
        lang: esIdioma,
        descripcion: texto
      });
    }

    const { error } = await this.client
      .from('tipos_imagen_traducciones')
      .upsert(traduccionesPayload, { onConflict: 'tipo_imagen_id,lang' });

    if (error) throw error;
  }

  private async guardarTraduccionesCatalogoAtraccion(
    catalogoAtraccionId: number,
    nombre: string,
    descripcion: string
  ) {
    const nombreLimpio = String(nombre ?? '').trim();
    const descripcionLimpia = String(descripcion ?? '').trim();

    if (!nombreLimpio && !descripcionLimpia) {
      return;
    }

    const traducciones = await this.supabase.traducirDesdeEspanol({
      title: nombreLimpio,
      description: descripcionLimpia
    });

    const idiomasDisponibles = await this.supabase.obtenerIdiomasPreviewAdmin();
    const mapaIdiomas = new Map(idiomasDisponibles.map((i) => [i.codigo.toLowerCase(), i.id]));

    const traduccionesPayload = Object.entries(traducciones ?? {})
      .map(([idioma, valor]: [string, any]) => {
        const idiomaId = mapaIdiomas.get(String(idioma).toLowerCase());
        if (!idiomaId) {
          return null;
        }

        return {
          catalogo_atraccion_id: catalogoAtraccionId,
          idioma_id: idiomaId,
          nombre: typeof valor?.title === 'string' ? valor.title : '',
          descripcion: typeof valor?.description === 'string' ? valor.description : ''
        };
      })
      .filter((item) => item !== null);

    const esId = mapaIdiomas.get('es') || ES_ID;
    if (!traduccionesPayload.some((item) => item!.idioma_id === esId)) {
      traduccionesPayload.push({
        catalogo_atraccion_id: catalogoAtraccionId,
        idioma_id: esId,
        nombre: nombreLimpio,
        descripcion: descripcionLimpia
      });
    } else {
      for (const item of traduccionesPayload) {
        if (item!.idioma_id === esId) {
          item!.nombre = nombreLimpio;
          item!.descripcion = descripcionLimpia;
        }
      }
    }

    const { error } = await this.client
      .from('catalogo_atracciones_traducciones')
      .upsert(traduccionesPayload, { onConflict: 'catalogo_atraccion_id,idioma_id' });

    if (error) throw error;
  }
}
