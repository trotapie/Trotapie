import { SupabaseService } from './supabase.service';

describe('Permisos de actualización de imágenes de fondo', () => {
  let service: SupabaseService;
  let query: { update: jasmine.Spy; select: jasmine.Spy; eq: jasmine.Spy; maybeSingle: jasmine.Spy };
  let client: { from: jasmine.Spy; rpc: jasmine.Spy; auth: { getUser: jasmine.Spy } };

  beforeEach(() => {
    query = jasmine.createSpyObj('query', ['update', 'select', 'eq', 'maybeSingle']);
    query.update.and.returnValue(query);
    query.select.and.returnValue(query);
    query.eq.and.returnValue(query);
    query.maybeSingle.and.returnValues(
      Promise.resolve({ data: null, error: null }),
      Promise.resolve({ data: { id: 1 }, error: null })
    );
    client = {
      from: jasmine.createSpy('from').and.returnValue(query),
      rpc: jasmine.createSpy('rpc').and.resolveTo({ data: true, error: null }),
      auth: { getUser: jasmine.createSpy('getUser').and.resolveTo({ data: { user: { id: 'user-id' } }, error: null }) }
    };
    // Avoid constructing a network client; exercise the service against a controlled Supabase response.
    service = Object.create(SupabaseService.prototype);
    Object.defineProperty(service, 'client', { value: client });
  });

  it('no cambia la autorización ni repite consultas cuando la actualización tiene éxito', async () => {
    query.maybeSingle.and.resolveTo({ data: { id: 1 }, error: null });
    await service.actualizarEstadoImagenFondoAdmin(1, true);
    expect(client.rpc).not.toHaveBeenCalled();
    expect(client.auth.getUser).not.toHaveBeenCalled();
  });

  it('distingue una sesión expirada de un problema de permisos', async () => {
    client.auth.getUser.and.resolveTo({ data: { user: null }, error: null });
    await expectAsync(service.actualizarEstadoImagenFondoAdmin(1, true)).toBeRejectedWithError(/sesión ha expirado/);
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('explica cuándo falta aplicar la migración de permisos', async () => {
    client.rpc.and.resolveTo({ data: null, error: { code: 'PGRST202', message: 'Function not found' } });
    await expectAsync(service.actualizarEstadoImagenFondoAdmin(1, true)).toBeRejectedWithError(/20261017130000_imagenes_fondo_destinos_edit_rls.sql/);
  });

  it('identifica cuentas sin destinos.edit sin elevarles el rol', async () => {
    client.rpc.and.resolveTo({ data: false, error: null });
    await expectAsync(service.actualizarEstadoImagenFondoAdmin(1, true)).toBeRejectedWithError(/Tu cuenta no tiene el permiso destinos.edit/);
    expect(query.update).toHaveBeenCalledTimes(1);
    expect(client.from.calls.allArgs().every(([table]) => table === 'imagenes_fondo')).toBeTrue();
  });

  it('no atribuye una imagen ausente a falta de permisos', async () => {
    query.maybeSingle.and.resolveTo({ data: null, error: null });
    await expectAsync(service.actualizarEstadoImagenFondoAdmin(1, true)).toBeRejectedWithError(/imagen ya no está disponible/);
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('no confunde un fallo de red con una migración pendiente', async () => {
    client.rpc.and.resolveTo({ data: null, error: { code: '', message: 'Failed to fetch' } });
    await expectAsync(service.actualizarEstadoImagenFondoAdmin(1, true)).toBeRejectedWithError(/No se pudieron comprobar los permisos/);
  });
});
