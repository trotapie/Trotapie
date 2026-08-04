export const PREFIJO_FOLIO_COTIZACION = 'CTRO-';

export function formatearFolioCotizacion(
  valor: number | string | null | undefined
): string {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return '';
  }

  return `${PREFIJO_FOLIO_COTIZACION}${Math.trunc(numero)}`;
}

export function obtenerIdCotizacionNumerico(
  valor: number | string | null | undefined
): number | null {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    return null;
  }

  return Math.trunc(numero);
}
