import type { MetricsRange } from '../metrics/metrics.types'

export interface OffCatalogDemandTotals {
  requests: number
  products: number
  // Incluye prospectos.
  customers: number
}

export interface OffCatalogDemandProduct {
  id: string
  name: string
  requests: number
  customers: number
  approx_quantity: number | null
  last_requested_at: string
}

export interface OffCatalogDemandResponse {
  period: MetricsRange
  totals: OffCatalogDemandTotals
  products: OffCatalogDemandProduct[]
}

export interface OffCatalogDemandRequest {
  id: string
  requested_at: string
  requested_quantity: number | null
  target_kind: 'customer' | 'prospect' | null
  target_id: string | null
  target_name: string | null
  seller_id: string | null
  seller_name: string | null
}

export interface OffCatalogDemandDetailResponse {
  period: MetricsRange
  product: { id: string; name: string }
  requests: OffCatalogDemandRequest[]
}
