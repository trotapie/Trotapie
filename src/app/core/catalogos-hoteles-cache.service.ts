import { Injectable } from '@angular/core';

// Los catálogos compartidos entre pantallas se mantienen únicamente durante la sesión de la página.
@Injectable({ providedIn: 'root' })
export class CatalogosHotelesCacheService {
  private readonly duracionMs = 10 * 60 * 1000;
  private readonly valores = new Map<string, { valor: unknown; vence: number }>();
  private readonly pendientes = new Map<string, Promise<unknown>>();
  private version = 0;

  obtener<T>(clave: string, cargar: () => Promise<T>): Promise<T> {
    const existente = this.valores.get(clave);
    if (existente && existente.vence > Date.now()) return Promise.resolve(existente.valor as T);

    const pendiente = this.pendientes.get(clave);
    if (pendiente) return pendiente as Promise<T>;

    const version = this.version;
    const solicitud = Promise.resolve().then(cargar).then((valor) => {
      if (version === this.version) {
        this.valores.set(clave, { valor, vence: Date.now() + this.duracionMs });
      }
      return valor;
    }).finally(() => {
      if (this.pendientes.get(clave) === solicitud) this.pendientes.delete(clave);
    });
    this.pendientes.set(clave, solicitud);
    return solicitud;
  }

  invalidar(): void {
    this.version++;
    this.valores.clear();
    this.pendientes.clear();
  }
}
