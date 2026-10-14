// HU-08: histórico de rutas ejecutadas. Contrato real contra PragmaCRM-Api:
// src/domain/types/executed-route.types.ts, expuesto en
// GET /api/v1/executed-routes?from=&to=&seller_id= (solo Administrador).
// Llaves en snake_case, tal como las manda la API.

import type { GeoPoint } from '../routes/routes.types'

/** Rango más largo que acepta el endpoint (EXECUTED_ROUTES_MAX_RANGE_DAYS en la API). */
export const EXECUTED_ROUTES_MAX_RANGE_DAYS = 92

/** Una parada ejecutada (`visit`): dónde hizo check-in el vendedor y qué anotó. */
export interface ExecutedStop {
  visit_id: string
  scheduled_visit_id: string | null
  customer: { id: string; name: string; trade_name: string | null }
  /** visit | dispatch | collection */
  stop_type: string | null
  is_extra: boolean
  started_at: string | null
  finished_at: string | null
  checkin_location: GeoPoint | null
  distance_meters: number | null
  /** Dentro del radio de validación GPS (80 m). Null si no hay distancia. */
  within_radius: boolean | null
  successful: boolean | null
  no_order_reason: string | null
  notes: string | null
}

/** Ruta de un vendedor en un día local, tal como se ejecutó. */
export interface ExecutedRoute {
  key: string
  /** YYYY-MM-DD en hora de El Salvador. */
  date: string
  seller: { id: string; name: string }
  /** Null: visitas sin asignación de ruta. */
  route: { id: string; name: string } | null
  route_user_id: string | null
  stops_planned: number
  stops_executed: number
  stops: ExecutedStop[]
}

export interface ExecutedRoutesHistory {
  from: string
  to: string
  routes: ExecutedRoute[]
}

export interface ExecutedRoutesFilters {
  from: string
  to: string
  /** Sin vendedor = todos. */
  sellerId: string | null
}
