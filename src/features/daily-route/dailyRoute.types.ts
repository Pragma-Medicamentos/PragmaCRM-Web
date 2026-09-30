// Ancla: PCRM-158 (parada extra en la ruta del día). Misma forma que
// GET /api/v1/me/route de la app móvil (domain/types/daily-route.types.ts en
// PragmaCRM-Api), reducida a los campos que consume este dashboard.
import type { GeoPoint, StopType } from '../routes/routes.types'

export interface DailyRouteSummary {
  id: string
  route_user_id: string
  name: string
  municipality: string | null
  zone: string | null
}

export interface DailyRouteStop {
  id: string // scheduled_visit.id
  route: { id: string; name: string }
  stop_type: StopType
  target_kind: 'customer' | 'prospect'
  target_id: string
  name: string
  trade_name: string | null
  address: string | null
  zone: string | null
  municipality: string | null
  phone: string | null
  location: GeoPoint | null
  sort_order: number | null
  is_extra: boolean
  reason: string | null
  completed_at: string | null
}

export interface DailyRoute {
  date: string
  routes: DailyRouteSummary[]
  stops: DailyRouteStop[]
}

export interface AddExtraStopInput {
  date: string // YYYY-MM-DD
  customer_id: string
  stop_type: StopType
  route_id?: string
  reason?: string
}

export interface ExtraStopCreated {
  id: string
  seller_id: string
  route_user_id: string
  route_id: string
  route_name: string
  date: string
  customer_id: string
  customer_name: string
  stop_type: StopType
  reason: string | null
  is_extra: boolean
  created_at: string
}
