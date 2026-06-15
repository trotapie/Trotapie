import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { map } from 'rxjs';

type AccessData = {
  roles?: string[];
  permissions?: string[];
};

export const AccessGuard: CanActivateFn | CanActivateChildFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.check().pipe(
    map((authenticated) => {
      if (!authenticated) {
        const redirectURL = state.url === '/sign-out' ? '' : `redirectURL=${state.url}`;
        return router.parseUrl(`sign-in?${redirectURL}`);
      }

      const data = route.data as AccessData;
      const roles = data?.roles ?? [];
      const permissions = data?.permissions ?? [];

      if (!roles.length && !permissions.length) {
        return true;
      }

      if (authService.isAdmin) {
        return true;
      }

      if (roles.length && authService.hasAnyRole(roles)) {
        return true;
      }

      if (permissions.length && authService.hasAnyPermission(permissions)) {
        return true;
      }

      return router.parseUrl(
        authService.role === 'admin'
          ? '/admin/dashboard'
          : '/admin/solicitudes-cotizacion'
      );
    })
  );
};
