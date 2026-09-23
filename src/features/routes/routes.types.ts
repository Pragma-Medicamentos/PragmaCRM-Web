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
