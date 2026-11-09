import { apiRequest } from '../../lib/api/apiClient'
import type { MetricsRange } from '../metrics/metrics.types'
import type { OffCatalogDemandDetailResponse, OffCatalogDemandResponse } from './offCatalog.types'

interface RequestOptions {
  signal?: AbortSignal
}

export function getOffCatalogDemand(
  range: MetricsRange,
  { signal }: RequestOptions = {}
): Promise<OffCatalogDemandResponse> {
  return apiRequest<OffCatalogDemandResponse>('/api/v1/product-requests/demand', { params: range, signal })
}

export function getOffCatalogProductDemand(
  productId: string,
  range: MetricsRange,
  { signal }: RequestOptions = {}
): Promise<OffCatalogDemandDetailResponse> {
  return apiRequest<OffCatalogDemandDetailResponse>(
    `/api/v1/product-requests/demand/${encodeURIComponent(productId)}`,
    { params: range, signal }
  )
}
