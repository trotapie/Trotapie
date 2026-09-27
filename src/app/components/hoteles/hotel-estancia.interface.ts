export interface HotelHorarios {
  check_in_desde?: string;
  check_in_hasta?: string;
  check_out?: string;
  desayuno_desde?: string;
  desayuno_hasta?: string;
}

export interface HotelPlanTodoIncluido {
  descripcion: string;
}

export function normalizarHorarios(value: unknown): HotelHorarios | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entrada = value as Record<string, unknown>;
  const horario: HotelHorarios = {};
  for (const clave of ['check_in_desde', 'check_in_hasta', 'check_out', 'desayuno_desde', 'desayuno_hasta'] as const) {
    if (typeof entrada[clave] === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(entrada[clave])) {
      horario[clave] = entrada[clave];
    }
  }
  return Object.keys(horario).length ? horario : null;
}

export function normalizarPlan(value: unknown): HotelPlanTodoIncluido | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const plan = value as Record<string, unknown>;
  const descripcion = typeof plan.descripcion === 'string' ? plan.descripcion.trim() : '';
  return descripcion ? { descripcion } : null;
}
