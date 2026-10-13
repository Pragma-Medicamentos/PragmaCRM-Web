import { apiRequest } from '../../lib/api/apiClient'
import type {
  CoverageResponse,
  KpiName,
  KpiValuesResponse,
  MetricsRange,
  ProductRankingResponse,
  PurchaseFrequencyResponse,
  SellerDetailResponse,
  SellerPerformanceResponse,
  TrendGranularity,
  TrendsResponse,
} from './metrics.types'

interface RequestOptions {
  signal?: AbortSignal
}

/** Sin `names` el backend calcula las 17 KPIs. */
export function getKpiValues(
  range: MetricsRange,
  names?: readonly KpiName[],
  { signal }: RequestOptions = {}
): Promise<KpiValuesResponse> {
  return apiRequest<KpiValuesResponse>('/api/v1/metrics/kpis/values', {
    params: { ...range, ...(names ? { names: names.join(',') } : {}) },
    signal,
  })
}

export function getTrends(
  range: MetricsRange,
  granularity: TrendGranularity,
  { signal }: RequestOptions = {}
): Promise<TrendsResponse> {
  return apiRequest<TrendsResponse>('/api/v1/metrics/trends', { params: { ...range, granularity }, signal })
}

export function getSellerPerformance(
  range: MetricsRange,
  { signal }: RequestOptions = {}
): Promise<SellerPerformanceResponse> {
  return apiRequest<SellerPerformanceResponse>('/api/v1/metrics/sellers', { params: range, signal })
}

export function getSellerDetail(
  sellerId: string,
  range: MetricsRange,
  { signal }: RequestOptions = {}
): Promise<SellerDetailResponse> {
  return apiRequest<SellerDetailResponse>(`/api/v1/metrics/sellers/${sellerId}`, { params: range, signal })
}

export function getCoverage(range: MetricsRange, { signal }: RequestOptions = {}): Promise<CoverageResponse> {
  return apiRequest<CoverageResponse>('/api/v1/metrics/coverage', { params: range, signal })
}

/** `limit` acota el top que devuelve el ranking; `total_amount` siempre es del periodo completo. */
export function getProductRanking(
  range: MetricsRange,
  limit: number,
  { signal }: RequestOptions = {}
): Promise<ProductRankingResponse> {
  return apiRequest<ProductRankingResponse>('/api/v1/metrics/products', { params: { ...range, limit }, signal })
}

export function getPurchaseFrequency(
  range: MetricsRange,
  { signal }: RequestOptions = {}
): Promise<PurchaseFrequencyResponse> {
  return apiRequest<PurchaseFrequencyResponse>('/api/v1/metrics/purchase-frequency', { params: range, signal })
}
