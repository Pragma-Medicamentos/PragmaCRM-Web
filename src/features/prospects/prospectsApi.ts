import { apiRequest } from '../../lib/api/apiClient'
import type { Paginated, Prospect } from './prospects.types'

export interface ListProspectsParams {
  page?: number
  limit?: number
  user_id?: string
}

// GET /api/v1/prospects (ADMIN) — data: Paginated<Prospect>.
export function listProspects(params: ListProspectsParams = {}): Promise<Paginated<Prospect>> {
  const query = new URLSearchParams()
  if (params.page != null) query.set('page', String(params.page))
  if (params.limit != null) query.set('limit', String(params.limit))
  if (params.user_id) query.set('user_id', params.user_id)

  const qs = query.toString()
  return apiRequest<Paginated<Prospect>>(`/api/v1/prospects${qs ? `?${qs}` : ''}`)
}
