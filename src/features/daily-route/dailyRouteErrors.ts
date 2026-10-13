import { ApiError } from '../../lib/api/apiClient'

// Códigos de `EXTRA_STOP_ERROR_CODES` (PragmaCRM-Api src/domain/types/extra-stop.types.ts)
// y campos de src/domain/schemas/extra-stop.schema.ts / daily-route.schema.ts.
const GENERIC = 'No se pudo completar la acción. Intentá de nuevo.'

const BY_CODE: Record<string, string> = {
  EXTRA_STOP_PAST_DATE: 'La fecha no puede ser anterior a hoy.',
  SELLER_NOT_FOUND: 'Vendedor no encontrado.',
  SELLER_INACTIVE: 'El vendedor está inactivo.',
  CUSTOMER_NOT_FOUND: 'Cliente no encontrado.',
  CUSTOMER_NO_GPS: 'El cliente no tiene ubicación GPS registrada.',
  SELLER_NO_ROUTE_ON_DATE: 'El vendedor no tiene ruta ese día.',
  ROUTE_ID_REQUIRED: 'El vendedor tiene varias rutas ese día; elegí la ruta.',
  ROUTE_NOT_ASSIGNED: 'La ruta indicada no está asignada a este vendedor ese día.',
  EXTRA_STOP_DUPLICATE: 'El cliente ya tiene una parada de ese tipo ese día.',
  EXTRA_STOP_NOT_FOUND: 'Parada extra no encontrada.',
  EXTRA_STOP_HAS_CHECKIN: 'La parada extra ya tiene check-in y no se puede eliminar.',
  EXTRA_STOP_DELETE_PAST: 'No se pueden eliminar paradas extra de días pasados.',
}

const BY_FIELD: Record<string, string> = {
  sellerId: 'Id de vendedor inválido.',
  stopId: 'Id de parada inválido.',
  customer_id: 'Id de cliente inválido.',
  route_id: 'Id de ruta inválido.',
  date: 'Fecha inválida, formato YYYY-MM-DD.',
  stop_type: 'Tipo de parada inválido: Visita, Despacho o Cobro.',
  reason: 'El motivo debe tener entre 1 y 500 caracteres.',
}

export function dailyRouteErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return GENERIC

  if (err.code) return BY_CODE[err.code] ?? GENERIC

  if (Array.isArray(err.errors) && err.errors.length > 0) {
    const first = err.errors[0] as { field?: unknown }
    if (typeof first?.field === 'string') return BY_FIELD[first.field] ?? GENERIC
  }

  if (err.status === 403 || err.status === 0) return err.message

  return GENERIC
}
