import { TestBed } from '@angular/core/testing';
import { DestinosService } from './destinos.service';
import { SupabaseService } from './supabase.service';
import { QueryCache } from './utils/query-cache';

describe('Destination option queries', () => {
  let service: DestinosService;
  let rows: any[];
  let serverLimit: number;
  let ranges: Array<[number, number]>;
  let counts: Array<string | undefined>;
  let filters: Array<[string, number]>;
  let emptyAfterFirst: boolean;

  beforeEach(() => {
    rows = Array.from({ length: 2105 }, (_, i) => ({
      destino_id: i + 1, destino_nombre: `Destino ${i + 1}`, pais_id: 10,
      region_id: 3, division_area_id: 2, activo: i % 2 === 0,
      destino_orden: i, destino_prioridad: 1
    }));
    serverLimit = 1000;
    ranges = [];
    counts = [];
    filters = [];
    emptyAfterFirst = false;
    const cache = new QueryCache();
    const client = {
      from: () => {
        let count: string | undefined;
        const query = {
          select: (_columns: string, options?: { count?: string }) => { count = options?.count; return query; },
          order: () => query,
          eq: (key: string, value: number) => { filters.push([key, value]); return query; },
          range: async (from: number, to: number) => {
            ranges.push([from, to]);
            counts.push(count);
            return {
              data: emptyAfterFirst && from > 0 ? [] : rows.slice(from, Math.min(to + 1, from + serverLimit)),
              count: count === 'exact' ? rows.length : null, error: null
            };
          },
          maybeSingle: async () => ({ data: { pais_id: 10, region_id: 3 }, error: null })
        };
        return query;
      }
    };
    TestBed.configureTestingModule({ providers: [{ provide: SupabaseService, useValue: {
      getClient: () => client,
      cachedRead: <T>(key: string, ttl: number, load: () => Promise<T>) => cache.read(key, ttl, load)
    } }] });
    service = TestBed.runInInjectionContext(() => new DestinosService());
  });

  it('loads 2105 options in three batches, counts once and reuses the result', async () => {
    const result = await service.obtenerCatalogoNacionalDestinos();
    expect(result.length).toBe(2105);
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(counts).toEqual(['exact', undefined, undefined]);
    expect(result[1].activo).toBeFalse();
    result[0].nombre = 'Edited locally';
    expect((await service.obtenerCatalogoNacionalDestinos())[0].nombre).toBe('Destino 1');
    expect(ranges.length).toBe(3);
  });

  it('advances by actual row count when the server caps responses below 1000', async () => {
    rows = rows.slice(0, 205);
    serverLimit = 100;
    expect((await service.obtenerCatalogoNacionalDestinos()).length).toBe(205);
    expect(ranges).toEqual([[0, 999], [100, 1099], [200, 1199]]);
  });

  it('fails instead of looping forever on an unexpectedly empty batch', async () => {
    emptyAfterFirst = true;
    await expectAsync(service.obtenerCatalogoNacionalDestinos()).toBeRejected();
    expect(ranges.length).toBe(2);
  });

  it('filters international options by country', async () => {
    rows = rows.slice(0, 2);
    await service.obtenerCatalogoInternacionalDestinosPorPais(10);
    expect(filters).toEqual([['pais_id', 10]]);
  });

  it('restores location by destination id without downloading any catalog pages', async () => {
    expect(await service.obtenerUbicacionDestinoInternacional(25)).toEqual({ paisId: 10, regionId: 3 });
    expect(filters).toEqual([['destino_id', 25]]);
    expect(ranges).toEqual([]);
  });
});
