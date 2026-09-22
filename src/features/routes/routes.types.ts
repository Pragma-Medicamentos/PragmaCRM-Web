// Ancla: `route` (RF-04). Contrato real: PragmaCRM-Api
// src/services/route.service.ts (RouteRecord), expuesto en
// GET/POST/PATCH /api/v1/routes. El envelope no transforma las llaves:
// llegan en snake_case tal como están en la base.
export interface Route {
  id: string
  name: string
  municipality: string | null
  zone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

// POST /api/v1/routes solo acepta name/municipality/zone. La composición de
// clientes (route_customer, wireframe 1h) no tiene endpoint todavía — queda
// fuera de este formulario.
export interface CreateRouteInput {
  name: string
  municipality?: string
  zone?: string
}

// Ancla: `route_user` (RF-04). Contrato real: RouteAssignmentRecord en
// route.service.ts, expuesto en GET/POST /api/v1/routes/:id/assignments,
// POST /api/v1/routes/:id/reassign y DELETE .../assignments/:day.
// `day` es 1=Lunes...7=Domingo (route_user_day_check); el backend nunca
// manda el nombre del día, solo el entero.
export interface RouteAssignment {
  id: string
  route_id: string
  user_id: string
  user_name: string
  day: number
  status: string | null
  created_at: string
  updated_at: string
}

export interface AssignRouteInput {
  user_id: string
  day: number
}

export type ReassignRouteInput = AssignRouteInput

// 1 = Lunes ... 7 = Domingo, en ese orden (route_user_day_check en la base).
export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const
export const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const

// PCRM-141 (depende de PCRM-140 en PragmaCRM-Api, todavía sin mergear).
// Contrato propuesto (a confirmar con backend) sobre `route_customer`
// (hoy: id, route_id, customer_id, sort_order — falta la columna `stop_type`):
//
//   GET    /api/v1/routes/:routeId/stops            → data: RouteStop[] (orden por sort_order)
//   PUT    /api/v1/routes/:routeId/stops             body: { stops: ReplaceRouteStopInput[] } (reemplazo completo, para drag&drop)
//
// Mientras el endpoint no exista, el backend genérico responde 404 "Not
// found" (ver isRouteNotImplemented) y la pantalla sigue usable con estado
// local sin persistir.
export type StopType = 'visit' | 'dispatch' | 'collection'

export const STOP_TYPE_LABELS: Record<StopType, string> = {
  visit: 'Visita',
  dispatch: 'Despacho',
  collection: 'Cobro',
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface RouteStop {
  id: string
  route_id: string
  customer_id: string
  customer_name: string
  sort_order: number
  stop_type: StopType
  location: GeoPoint | null
}

export interface ReplaceRouteStopInput {
  customer_id: string
  stop_type: StopType
  sort_order: number
}
