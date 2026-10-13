/*
 * Panel de métricas (RF-09 · PCRM-13). Contrato real: PragmaCRM-Api
 * docs/METRICS_API.md, src/services/metrics.service.ts y
 * src/domain/types/metrics.types.ts. Todas las rutas cuelgan de
 * /api/v1/metrics, solo Administrador. Las llaves llegan en snake_case.
 *
 * Convenciones del backend que el cliente tiene que respetar:
 * - Dinero = string decimal con 2 decimales ("118.00"), nunca centavos.
 * - Porcentajes en escala 0–100 con 1 decimal, como número.
 * - `null` = "no se puede calcular en este periodo", nunca cero.
 * - `from`/`to` son días locales de El Salvador (YYYY-MM-DD), inclusivos,
 *   rango máximo de 366 días.
 */

export type Money = string

/** Rango que se manda en la query (`from`/`to`). */
export interface MetricsRange {
  from: string
  to: string
}

export interface MetricsThresholds {
  inactivity_days: number
  credit_term_days: number
  gps_radius_meters: number
}

/** Bloque común de toda respuesta: el rango resuelto y los umbrales usados. */
export interface MetricsContext {
  period: MetricsRange
  thresholds: MetricsThresholds
}

/** Mismo orden que KPI_NAMES en src/domain/schemas/metrics.schema.ts. */
export const KPI_NAMES = [
  'stops_executed',
  'stops_by_type',
  'visited_customers',
  'effective_visits_rate',
  'average_visit_minutes',
  'total_sales',
  'orders_count',
  'average_ticket',
  'average_monthly_sales',
  'route_effectiveness',
  'goal_compliance',
  'customers_without_visit',
  'recovered_customers',
  'new_prospects',
  'purchase_frequency_days',
  'overdue_portfolio',
  'pending_collections',
] as const

export type KpiName = (typeof KPI_NAMES)[number]

export interface StopsByType {
  visit: number
  dispatch: number
  collection: number
}

/** Tipo de `value` de cada KPI (ver la tabla de METRICS_API.md). */
export interface KpiValueMap {
  stops_executed: number
  stops_by_type: StopsByType
  visited_customers: number
  effective_visits_rate: number | null
  average_visit_minutes: number | null
  total_sales: Money
  orders_count: number
  average_ticket: Money | null
  average_monthly_sales: Money
  route_effectiveness: Money | null
  goal_compliance: number | null
  customers_without_visit: number
  recovered_customers: number
  new_prospects: number
  purchase_frequency_days: number | null
  /** Foto al día de hoy: `previous_value` siempre es null. */
  overdue_portfolio: Money
  /** Foto al día de hoy: `previous_value` siempre es null. */
  pending_collections: Money
}

export type KpiResult<K extends KpiName> =
  | { value: KpiValueMap[K]; previous_value: KpiValueMap[K] | null }
  | { error: string }

export type KpiResults = { [K in KpiName]?: KpiResult<K> }

/** GET /metrics/kpis/values — un KPI que falla viene como `{ error }` sin tumbar el lote. */
export interface KpiValuesResponse extends MetricsContext {
  /** Rango de igual largo que termina el día antes de `from`. */
  previous_period: MetricsRange
  kpis: KpiResults
}

export type TrendGranularity = 'week' | 'month'

export interface TrendPoint {
  /** Primer día local del balde (lunes, o día 1); puede ser anterior a `from`. */
  bucket_start: string
  stops: number
  orders_count: number
  total_sales: Money
  average_ticket: Money | null
}

/** GET /metrics/trends — baldes vacíos rellenados con ceros. */
export interface TrendsResponse extends MetricsContext {
  granularity: TrendGranularity
  points: TrendPoint[]
}

/** Una fila de GET /metrics/sellers, ordenadas por venta desc. */
export interface SellerPerformance {
  user_id: string
  name: string
  active: boolean
  stops_executed: number
  stops_by_type: StopsByType
  visited_customers: number
  orders_count: number
  total_sales: Money
  average_ticket: Money | null
  goal_amount: Money | null
  goal_compliance: number | null
  route_sales: Money
  executed_route_days: number
  sales_per_route: Money | null
  /** Despachos que ejecutó este vendedor cuya venta pertenece a otro. */
  dispatches_for_others: number
  portfolio_customers: number
}

export interface SellerPerformanceResponse extends MetricsContext {
  sellers: SellerPerformance[]
}

export interface InactiveCustomer {
  customer_id: string
  name: string
  trade_name: string | null
  zone: string | null
  last_visit_at: string | null
  /** null = nunca visitado. */
  days_since_last_visit: number | null
}

/** GET /metrics/sellers/:id — la fila expandida de 1f. */
export interface SellerDetailResponse extends MetricsContext {
  seller: SellerPerformance
  weekly_trend: TrendPoint[]
  customers_without_visit: InactiveCustomer[]
}

export interface CoverageCustomer {
  customer_id: string
  name: string
  trade_name: string | null
  lat: number
  lng: number
  visited: boolean
  last_visit_at: string | null
}

/** GET /metrics/coverage — los conteos cubren toda la cartera activa; `customers` solo los que tienen GPS. */
export interface CoverageResponse extends MetricsContext {
  visited: number
  not_visited: number
  without_location: number
  customers: CoverageCustomer[]
}

/** Una fila de GET /metrics/products; `position` es 1-based por monto desc. */
export interface ProductRankingRow {
  position: number
  /** erp_product_id. */
  product_id: number
  code: string | null
  name: string
  amount: Money
  /** Decimal con hasta 4 decimales ("120.0000"). */
  units: string
}

/** GET /metrics/products — top N por monto; `total_amount` es del periodo completo. */
export interface ProductRankingResponse extends MetricsContext {
  products: ProductRankingRow[]
  total_amount: Money
}

export interface PurchaseFrequencyBucket {
  label: string
  min_days: number
  max_days: number | null
  customers: number
}

/** GET /metrics/purchase-frequency — 5 rangos fijos (0-7 … 61+). */
export interface PurchaseFrequencyResponse extends MetricsContext {
  buckets: PurchaseFrequencyBucket[]
  insufficient_data: number
  average_days: number | null
}
