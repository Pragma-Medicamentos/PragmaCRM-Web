import { apiRequest } from '../../lib/api/apiClient'
import type { AddExtraStopInput, DailyRoute, ExtraStopCreated } from './dailyRoute.types'

// GET    /api/v1/sellers/:sellerId/daily-route?date=YYYY-MM-DD → data: DailyRoute
// POST   /api/v1/sellers/:sellerId/daily-route/extra-stops body { date, customer_id, stop_type, route_id?, reason? } → 201 data: ExtraStopCreated
// DELETE /api/v1/sellers/:sellerId/daily-route/extra-stops/:stopId → 200 data: { id, deleted: true }
export function getSellerDailyRoute(sellerId: string, date: string): Promise<DailyRoute> {
  return apiRequest<DailyRoute>(`/api/v1/sellers/${sellerId}/daily-route`, { params: { date } })
}

export function addExtraStop(sellerId: string, input: AddExtraStopInput): Promise<ExtraStopCreated> {
  return apiRequest<ExtraStopCreated>(`/api/v1/sellers/${sellerId}/daily-route/extra-stops`, {
    method: 'POST',
    data: input,
  })
}

export function deleteExtraStop(sellerId: string, stopId: string): Promise<{ id: string; deleted: boolean }> {
  return apiRequest(`/api/v1/sellers/${sellerId}/daily-route/extra-stops/${stopId}`, { method: 'DELETE' })
}
