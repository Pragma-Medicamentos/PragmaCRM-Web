import type { RouteMetrics } from './metrics.types'

/**
 * `sales_by_weekday` de GET /metrics/routes/:id llega con el día como número
 * local, 0 domingo … 6 sábado — el backend nunca manda el nombre. (No es el
 * 1..7 de `route_user.day`, que empieza en lunes: ver routes.types.ts.)
 */
export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const

export const WEEKDAY_LABELS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const

/** Municipio y zona de la ruta, lo que venga; `null` en ambos deja la línea fuera. */
export function routePlace(route: RouteMetrics): string | null {
  const parts = [route.municipality, route.zone].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
