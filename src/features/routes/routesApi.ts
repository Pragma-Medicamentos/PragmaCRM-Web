import { apiFetch, apiCall } from '../../lib/api/apiClient'
import type {
  AssignRouteInput,
  CreateRouteInput,
  ReassignRouteInput,
  ReplaceRouteStopInput,
  Route,
  RouteAssignment,
  RouteStop,
} from './routes.types'

export function listRoutes(token: string | null, filters: { active?: boolean } = {}): Promise<Route[]> {
  const query = filters.active !== undefined ? `?active=${filters.active}` : ''
  return apiFetch<Route[]>(`/api/v1/routes${query}`, token)
}

export function createRoute(token: string | null, input: CreateRouteInput): Promise<Route> {
  return apiFetch<Route>('/api/v1/routes', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function listRouteAssignments(token: string | null, routeId: string): Promise<RouteAssignment[]> {
  return apiFetch<RouteAssignment[]>(`/api/v1/routes/${routeId}/assignments`, token)
}

export function assignRoute(
  token: string | null,
  routeId: string,
  input: AssignRouteInput
): Promise<RouteAssignment> {
  return apiFetch<RouteAssignment>(`/api/v1/routes/${routeId}/assignments`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function reassignRoute(
  token: string | null,
  routeId: string,
  input: ReassignRouteInput
): Promise<RouteAssignment> {
  return apiFetch<RouteAssignment>(`/api/v1/routes/${routeId}/reassign`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

// DELETE .../assignments/:day no trae `data` en el envelope (solo confirma
// el mensaje), así que usa apiCall en vez de apiFetch — mismo motivo que
// POST /api/v1/auth/otp, pero autenticado.
export function unassignRouteDay(token: string | null, routeId: string, day: number): Promise<string> {
  return apiCall(`/api/v1/routes/${routeId}/assignments/${day}`, token, { method: 'DELETE' })
}

// Contrato bloqueado por PragmaCRM-Api PCRM-140 (PR #28) — ver routes.types.ts.
export function listRouteStops(token: string | null, routeId: string): Promise<RouteStop[]> {
  return apiFetch<RouteStop[]>(`/api/v1/routes/${routeId}/stops`, token)
}

export function replaceRouteStops(
  token: string | null,
  routeId: string,
  stops: ReplaceRouteStopInput[]
): Promise<RouteStop[]> {
  return apiFetch<RouteStop[]>(`/api/v1/routes/${routeId}/stops`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stops }),
  })
}
