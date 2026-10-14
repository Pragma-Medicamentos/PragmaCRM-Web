import { apiRequest } from '../../lib/api/apiClient'
import type { ExecutedRoutesFilters, ExecutedRoutesHistory } from './executedRoutes.types'

// GET /api/v1/executed-routes?from=YYYY-MM-DD&to=YYYY-MM-DD&seller_id=uuid → data: ExecutedRoutesHistory
export function getExecutedRoutes({ from, to, sellerId }: ExecutedRoutesFilters): Promise<ExecutedRoutesHistory> {
  return apiRequest<ExecutedRoutesHistory>('/api/v1/executed-routes', {
    params: { from, to, ...(sellerId ? { seller_id: sellerId } : {}) },
  })
}
