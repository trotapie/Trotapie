import { Injectable, inject } from '@angular/core';
import { UserService } from 'app/core/user/user.service';
import { from, map, Observable, of, switchMap, catchError } from 'rxjs';
import { SupabaseService } from '../supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _authenticated = false;

  private _supabase = inject(SupabaseService);
  private _userService = inject(UserService);

  // ---------------------------------------------
  // Access token (compatibilidad con Fuse)
  // ---------------------------------------------
  set accessToken(token: string) {
    localStorage.setItem('accessToken', token);
  }

  get accessToken(): string {
    return localStorage.getItem('accessToken') ?? '';
  }

  // ---------------------------------------------
  // Sign in (Supabase)
  // ---------------------------------------------
  signIn(credentials: { email: string; password: string }): Observable<any> {
    // si ya está autenticado en memoria, no bloquees el login
    // (puedes decidir mantener el throw, pero luego causa fricción)
    if (this._authenticated) {
      return of(true);
    }

    return from(this._supabase.signIn(credentials.email, credentials.password)).pipe(
      switchMap(({ data, error }) => {
        if (error || !data?.session) {
          throw error ?? new Error('No session returned');
        }

        // token (compatibilidad)
        this.accessToken = data.session.access_token;

        // auth flag
        this._authenticated = true;

        // user en Fuse UserService (mapea como necesites)
        const u = data.user;
        this._userService.user = {
          id: u.id,
          email: u.email,
          name: (u.user_metadata as any)?.name
            ?? (u.user_metadata as any)?.full_name
            ?? u.email,
        } as any;

        return of({ user: this._userService.user, session: data.session });
      }),
      catchError((err) => {
        this._authenticated = false;
        localStorage.removeItem('accessToken');
        throw err;
      })
    );
  }

  // ---------------------------------------------
  // Sign out
  // ---------------------------------------------
  signOut(): Observable<any> {
    return from(this._supabase.signOut()).pipe(
      map(() => {
        localStorage.removeItem('accessToken');
        this._authenticated = false;
        return true;
      }),
      catchError(() => {
        // aunque falle, limpia local
        localStorage.removeItem('accessToken');
        this._authenticated = false;
        return of(true);
      })
    );
  }

  // ---------------------------------------------
  // Check (AuthGuard / initialDataResolver)
  // ---------------------------------------------
  check(): Observable<boolean> {
  if (this._authenticated) {
    return of(true);
  }

  return from(this._supabase.getSession()).pipe(
    switchMap(({ data, error }) => {
      const session = data?.session;

      if (error || !session) {
        this._authenticated = false;
        return of(false);
      }

      this.accessToken = session.access_token; // opcional, por compatibilidad
      this._authenticated = true;

      const u = session.user;
      this._userService.user = {
        id: u.id,
        email: u.email,
        name: (u.user_metadata as any)?.name
          ?? (u.user_metadata as any)?.full_name
          ?? u.email,
      } as any;

      return of(true);
    }),
    catchError(() => of(false))
  );
}
}
