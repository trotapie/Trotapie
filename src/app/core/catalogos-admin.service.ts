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
          idioma_id,
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
          .select('id, descripcion, clave, activo, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
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
          .select('id, tipo_descuento, icono')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
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
          .select('id, codigo, categoria, activo, created_at')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
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
          .select('id, clave, nombre, activo, created_at')
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'tipo_imagen': {
        const { data, error } = await this.client
          .from('tipos_imagen')
          .select('id, clave, orden')
          .order('orden', { ascending: true })
          .order('id', { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case 'tipos_habitacion': {
        const { data, error } = await this.client
          .from('tipos_habitacion')
          .select('id, nombre_habitacion, descripcion')
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
          const traduccionEs = item?.traducciones?.find((x: any) => x.idioma_id === ES_ID);
          return {
            id: item.id,
            clave: item.clave,
            icono: item.icono,
            orden: item.orden,
            activo: item.activo,
            created_at: item.created_at,
            nombre: traduccionEs?.nombre ?? '',
            descripcion: traduccionEs?.descripcion ?? '',
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
        return data;
      }
      default:
        throw new Error('Este catalogo no admite creacion desde esta pantalla.');
    }
  }

  async eliminarCatalogoAdmin(catalogo: CatalogoAdminKey, id: number) {
    switch (catalogo) {
      case 'continentes': {
        const { error } = await this.client
          .from('continentes')
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
        return data;
      }
      case 'tipos_habitacion': {
        const { data, error } = await this.client
          .from('tipos_habitacion')
          .update({
            nombre_habitacion: payload.nombre_habitacion ?? null,
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
            activo: payload.activo ?? null
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
}
