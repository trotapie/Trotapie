export interface TratamientoCliente {
  id?: number | null;
  nombre?: string | null;
  abreviacion?: string | null;
}

export function construirNombreClienteVisible(input: {
  tratamientoAbreviacion?: string | null;
  nombreCompleto?: string | null;
  nombreFallback?: string | null;
}): string {
  const tratamiento = String(input?.tratamientoAbreviacion ?? '').trim();
  const nombreCompleto = String(input?.nombreCompleto ?? '').trim();
  const nombreFallback = String(input?.nombreFallback ?? '').trim();

  if (tratamiento && nombreCompleto) {
    return `${tratamiento} ${nombreCompleto}`.trim();
  }

  if (nombreCompleto) {
    return nombreCompleto;
  }

  return nombreFallback;
}
