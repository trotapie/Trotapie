import { CanDeactivateFn } from '@angular/router';

export interface ExperienciaConCambios {
  readonly tieneCambiosPendientes: boolean;
}

export const experienciasPendingGuard: CanDeactivateFn<ExperienciaConCambios> = (component) =>
  !component.tieneCambiosPendientes || window.confirm('Tienes cambios sin guardar. ¿Salir y descartarlos?');
