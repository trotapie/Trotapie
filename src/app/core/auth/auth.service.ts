import { Injectable, inject } from '@angular/core';
import { UserService } from 'app/core/user/user.service';
import { from, map, Observable, of, switchMap, catchError, throwError, timeout } from 'rxjs';
import { SupabaseService } from '../supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _authenticated = false;
  private _role = '';
  private _roles = new Set<string>();
  private _permissions = new Set<string>();
  private _requiresPasswordChange = false;
  private _employeeStatusId: number | null = null;
  private _accessToken = '';

  private _supabase = inject(SupabaseService);
  private _userService = inject(UserService);

  // ---------------------------------------------
  // Access token (in-memory only)
  // ---------------------------------------------
  set accessToken(token: string) {
    this._accessToken = token;
  }

  get accessToken(): string {
    return this._accessToken;
  }

  get authenticated(): boolean {
    return this._authenticated;
  }

  get role(): string {
    return this._role;
  }

  get permissions(): string[] {
    return Array.from(this._permissions);
  }

  get isAdmin(): boolean {
    return this._roles.has('admin') || this._role === 'admin';
  }

  get requiresPasswordChange(): boolean {
    return this._requiresPasswordChange;
  }

  get employeeStatusId(): number | null {
    return this._employeeStatusId;
  }

  hasRole(role: string): boolean {
    return this.isAdmin || this._roles.has(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return this.isAdmin || roles.some((role) => this._roles.has(role));
  }

  hasPermission(permission: string): boolean {
    return this.isAdmin || this._permissions.has(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return this.isAdmin || permissions.some((permission) => this._permissions.has(permission));
  }

  private _clearAccessState(): void {
    this._role = '';
    this._roles = new Set<string>();
    this._permissions = new Set<string>();
    this._requiresPasswordChange = false;
    this._employeeStatusId = null;
  }

  private async _loadAccessState(userId: string): Promise<void> {
    const client = this._supabase.getClient();
    let role = 'cotizador';
    let roles = ['cotizador'];
    let permissions: string[] = [];
    let requiresPasswordChange = false;
    let employeeStatusId: number | null = null;

    try {
      const { data: profile } = await client
        .from('profiles')
        .select('role, primera_vez_login')
        .eq('id', userId)
        .maybeSingle();

      role = String(profile?.role ?? 'cotizador');
      requiresPasswordChange = Boolean(profile?.primera_vez_login);

      roles = [role];

      if (!roles.length) {
        roles = [role];
      }

      role = roles.includes('admin') ? 'admin' : roles[0] ?? role;

      const { data: usuarioSesion, error: usuarioSesionError } = await client.auth.getUser();
      if (usuarioSesionError) throw usuarioSesionError;

      // Temporary exception for the account used to validate employee status flows.
      const esUsuarioDePrueba = String(usuarioSesion.user?.email ?? '').trim().toLowerCase() === 'pruebausuarios@gmail.com';
      if (!esUsuarioDePrueba) {
        const { data: empleado, error: empleadoError } = await client
          .from('empleados')
          .select('id, estatus_id')
          .eq('auth_user_id', userId)
          .maybeSingle();

        if (empleadoError) throw empleadoError;
        if (!empleado?.id) {
          throw new Error('Tu usuario no tiene un empleado activo asociado.');
        }

        employeeStatusId = Number.isFinite(Number(empleado.estatus_id))
          ? Number(empleado.estatus_id)
          : null;

        const { data: estatusEmpleado, error: estatusError } = await client
          .from('estatus_empleado')
          .select('clave, activo')
          .eq('id', employeeStatusId ?? -1)
          .maybeSingle();

        if (estatusError) throw estatusError;
        if (String(estatusEmpleado?.clave ?? '').trim().toLowerCase() !== 'activo' || !estatusEmpleado?.activo) {
          throw new Error('Tu usuario esta inactivo. Solicita al administrador que te habilite.');
        }
      }

      const { data: roleRow } = await client
        .from('roles')
        .select('id')
        .eq('key', role)
        .maybeSingle();

      if (roleRow?.id) {
        const { data: rolePermissions } = await client
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', roleRow.id);

        const permissionIds = (rolePermissions ?? [])
          .map((item: any) => Number(item.permission_id))
          .filter((id) => Number.isFinite(id));

        if (permissionIds.length) {
          const { data: permissionRows } = await client
            .from('permissions')
            .select('key')
            .in('id', permissionIds);

          permissions = (permissionRows ?? [])
            .map((item: any) => String(item.key))
            .filter(Boolean);
        }
      }

    } catch (error) {
      this._role = '';
      this._permissions = new Set<string>();
      this._requiresPasswordChange = false;
      this._employeeStatusId = null;
      throw error;
    }

    this._role = role;
    this._roles = new Set(roles);
    this._permissions = new Set(permissions);
    this._requiresPasswordChange = requiresPasswordChange;
    this._employeeStatusId = employeeStatusId;
  }

  // ---------------------------------------------
  // Sign in (Supabase)
  // ---------------------------------------------
  signIn(credentials: { email: string; password: string }): Observable<any> {
    // si ya está autenticado en memoria, no bloquees el login
    // (puedes decidir mantener el throw, pero luego causa fricción)
    return from(this._supabase.signIn(credentials.email, credentials.password)).pipe(
      switchMap(({ data, error }) => {
        if (error || !data?.session) {
          throw error ?? new Error('No session returned');
        }

        // token (compatibilidad)
        this.accessToken = data.session.access_token;

        // auth flag
        this._authenticated = true;
        this._role = 'cotizador';
        this._permissions = new Set<string>();
        this._requiresPasswordChange = false;

        // user en Fuse UserService (mapea como necesites)
        const u = data.user;
        const user = {
          id: u.id,
          email: u.email,
          name: (u.user_metadata as any)?.name
            ?? (u.user_metadata as any)?.full_name
            ?? u.email,
          role: (u.user_metadata as any)?.role ?? 'cotizador',
          permissions: [],
          requiresPasswordChange: false,
          employeeStatusId: null,
        } as any;

        this._userService.user = user;

        return from(this._loadAccessState(u.id)).pipe(
          map(() => {
            const enrichedUser = {
              ...user,
              role: this._role,
              permissions: this.permissions,
              requiresPasswordChange: this._requiresPasswordChange,
              employeeStatusId: this._employeeStatusId,
            };

            this._userService.user = enrichedUser as any;

            return { user: enrichedUser, session: data.session };
          })
        );
      }),
      catchError((err) => {
        return from(this._supabase.signOut()).pipe(
          switchMap(() => {
            this._authenticated = false;
            this._accessToken = '';
            this._clearAccessState();
            return throwError(() => err);
          })
        );
      })
    );
  }

  // ---------------------------------------------
  // Sign out
  // ---------------------------------------------
  signOut(): Observable<any> {
    return from(this._supabase.signOut()).pipe(
      map(() => {
        this._accessToken = '';
        this._authenticated = false;
        this._clearAccessState();
        return true;
      }),
      catchError(() => {
        this._accessToken = '';
        this._authenticated = false;
        this._clearAccessState();
        return of(true);
      })
    );
  }

  completeFirstLoginPassword(password: string): Observable<boolean> {
    return from(this._supabase.completarPrimerLoginEmpleado(password)).pipe(
      switchMap(() => from(this._supabase.getSession())),
      switchMap(({ data, error }) => {
        const userId = data?.session?.user?.id;
        if (error || !userId) {
          throw error ?? new Error('No se pudo actualizar la sesion.');
        }

        this.accessToken = data.session.access_token;

        return from(this._loadAccessState(userId)).pipe(
          map(() => data.session)
        );
      }),
      map((session) => {
        const user = session.user;
        this._requiresPasswordChange = false;

        this._userService.user = {
          id: user.id,
          email: user.email,
          name: (user.user_metadata as any)?.name
            ?? (user.user_metadata as any)?.full_name
            ?? user.email,
          role: this._role,
          permissions: this.permissions,
          requiresPasswordChange: false,
          employeeStatusId: this._employeeStatusId,
        } as any;

        return true;
      })
    );
  }

  // ---------------------------------------------
  // Check (AuthGuard / initialDataResolver)
  // ---------------------------------------------
  check(): Observable<boolean> {
    return from(this._supabase.getSession()).pipe(
      switchMap(({ data, error }) => {
        const session = data?.session;

        if (error || !session) {
          this._authenticated = false;
          this._clearAccessState();
          return of(false);
        }

        this.accessToken = session.access_token; // opcional, por compatibilidad
        this._authenticated = true;

        const u = session.user;
        const baseUser = {
          id: u.id,
          email: u.email,
          name: (u.user_metadata as any)?.name
            ?? (u.user_metadata as any)?.full_name
            ?? u.email,
          role: (u.user_metadata as any)?.role ?? 'cotizador',
          permissions: [],
          requiresPasswordChange: false,
          employeeStatusId: null,
        } as any;

        this._userService.user = baseUser;

        return from(this._loadAccessState(u.id)).pipe(
          map(() => {
            this._userService.user = {
              ...baseUser,
              role: this._role,
              permissions: this.permissions,
              requiresPasswordChange: this._requiresPasswordChange,
              employeeStatusId: this._employeeStatusId,
            } as any;

            return true;
          })
        );
      }),
      // A failed profile lookup must not leave a route guard waiting indefinitely.
      timeout(15_000),
      catchError(() => {
        this._accessToken = '';
        this._authenticated = false;
        this._clearAccessState();
        return of(false);
      })
    );
  }
}
