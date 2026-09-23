import { apiRequest, apiCall } from '../../lib/api/apiClient'
import type {
  AssignRouteInput,
  CreateRouteInput,
  ReassignRouteInput,
  ReplaceRouteStopInput,
  Route,
  RouteAssignment,
  RouteStop,
} from './routes.types'

export function listRoutes(filters: { active?: boolean } = {}): Promise<Route[]> {
  return apiRequest<Route[]>('/api/v1/routes', { params: filters })
}

export function createRoute(input: CreateRouteInput): Promise<Route> {
  return apiRequest<Route>('/api/v1/routes', { method: 'POST', data: input })
}

export function listRouteAssignments(routeId: string): Promise<RouteAssignment[]> {
  return apiRequest<RouteAssignment[]>(`/api/v1/routes/${routeId}/assignments`)
}

export function assignRoute(routeId: string, input: AssignRouteInput): Promise<RouteAssignment> {
  return apiRequest<RouteAssignment>(`/api/v1/routes/${routeId}/assignments`, {
    method: 'POST',
    data: input,
  })
}

export function reassignRoute(routeId: string, input: ReassignRouteInput): Promise<RouteAssignment> {
  return apiRequest<RouteAssignment>(`/api/v1/routes/${routeId}/reassign`, {
    method: 'POST',
    data: input,
  })
}

// DELETE .../assignments/:day no trae `data` en el envelope (solo confirma
// el mensaje), así que usa apiCall en vez de apiRequest — mismo motivo que
// POST /api/v1/auth/otp, pero autenticado.
export function unassignRouteDay(routeId: string, day: number): Promise<string> {
  return apiCall(`/api/v1/routes/${routeId}/assignments/${day}`, { method: 'DELETE' })
}

// Contrato bloqueado por PragmaCRM-Api PCRM-140 (PR #28) — ver routes.types.ts.
export function listRouteStops(routeId: string): Promise<RouteStop[]> {
  return apiRequest<RouteStop[]>(`/api/v1/routes/${routeId}/stops`)
}

export function replaceRouteStops(routeId: string, stops: ReplaceRouteStopInput[]): Promise<RouteStop[]> {
  return apiRequest<RouteStop[]>(`/api/v1/routes/${routeId}/stops`, { method: 'PUT', data: { stops } })
}
