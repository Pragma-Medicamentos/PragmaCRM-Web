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

/*
 * Métricas de producto (PCRM-177). Contrato real: PragmaCRM-Api
 * src/domain/types/productMetrics.types.ts, endpoints 8 a 10 de METRICS_API.md.
 *
 * Excepción deliberada a la convención del panel: un producto que no vendió en
 * el periodo responde 200 con ceros, no con `null` — vendió exactamente cero.
 */

/** La fila del catálogo, repetida donde se nombra un producto. */
export interface ProductIdentity {
  /** erp_product_id, la llave natural del ERP. */
  product_id: number
  code: string | null
  name: string
  product_group: string | null
}

/** Un vendedor que movió el producto en el periodo. */
export interface ProductSeller {
  user_id: string
  name: string
  amount: Money
  /** Unidades en la unidad base del producto; decimal con hasta 4 decimales. */
  units: string
}

/** GET /metrics/products/:id — ficha de un producto en el periodo. */
export interface ProductMetricsResponse extends MetricsContext {
  product: ProductIdentity
  /** Monto vendido en el periodo, IVA incluido. "0.00" sin ventas. */
  amount: Money
  units: string
  /** Monto entre las facturas que lo incluyen. "0.00" sin ventas. */
  average_ticket: Money
  /** La suma de `sellers[].amount` puede ser menor que `amount`: las líneas sin vendedor no se atribuyen. */
  sellers: ProductSeller[]
}

/** Un cliente que compró el producto en el periodo. */
export interface ProductCustomer {
  /** uuid de `customer`: el mismo de /clientes/:id. */
  customer_id: string
  name: string
  trade_name: string | null
  amount: Money
  units: string
  /** Facturas del periodo que incluyen el producto. */
  invoices: number
  last_purchase_at: string
}

/** GET /metrics/products/:id/customers — compradores por monto, paginados. */
export interface ProductCustomersResponse extends MetricsContext {
  items: ProductCustomer[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface ProductWithoutMovement extends ProductIdentity {
  /** Última venta confirmada anterior al fin del periodo; null si nunca vendió. */
  last_sold_at: string | null
  /** Días entre esa venta y el fin del periodo; null si nunca vendió. */
  days_since_last_sale: number | null
}

/** Productos activos sin venta confirmada en los últimos N días que terminan en `to`. */
export interface ProductMovementCounts {
  days_30: number
  days_60: number
  days_90: number
}

/** GET /metrics/products/no-movement — catálogo quieto en el periodo. */
export interface ProductsNoMovementResponse extends MetricsContext {
  /** Tamaño del catálogo activo contra el que se leen los conteos. */
  active_products: number
  products: ProductWithoutMovement[]
  /** Las tres ventanas cuelgan del fin del periodo, no del largo del rango. */
  without_movement: ProductMovementCounts
}

/*
 * Métricas por ruta (PCRM-178). Contrato real: PragmaCRM-Api
 * src/domain/types/routeMetrics.types.ts, endpoint 11 de METRICS_API.md.
 * Mismas convenciones que el resto del panel: dinero como string de dos
 * decimales, porcentajes 0–100 con un decimal y `null` para "no se puede
 * calcular en este periodo", nunca cero.
 *
 * Una venta es de la ruta de la que salió la parada de su visita:
 * `sale.visit_id -> visit.scheduled_visit_id -> scheduled_visit.route_user_id
 * -> route_user.route_id`.
 */

/** Un vendedor que trabaja la ruta: asignado hoy, o ejecutando paradas en ella. */
export interface RouteSeller {
  user_id: string
  name: string
}

/** Una card de ruta, y el resumen del detalle. */
export interface RouteMetrics {
  route_id: string
  name: string
  municipality: string | null
  zone: string | null
  active: boolean
  /** Venta atribuida a la ruta en el periodo, con IVA incluido. */
  amount: Money
  /** Lo mismo en el periodo anterior de igual largo. */
  previous_amount: Money
  /** Variación % contra `previous_amount`. Null si el periodo anterior no vendió. */
  change_rate: number | null
  /** Clientes de la agenda con su parada ejecutada, sobre los agendados × 100. Null sin agenda. */
  visit_coverage_rate: number | null
  sellers: RouteSeller[]
}

/** GET /metrics/routes — todas las rutas, la de más venta primero. */
export interface MetricsRoutesResponse extends MetricsContext {
  previous_period: MetricsRange
  routes: RouteMetrics[]
  /** Venta atribuida de todas las rutas del periodo. */
  total_amount: Money
}

/** Un cliente del top de la ruta, por monto atribuido. */
export interface RouteCustomerSales {
  position: number
  customer_id: string
  name: string
  trade_name: string | null
  amount: Money
  orders_count: number
}

/** Un producto del top de la ruta, por monto atribuido. */
export interface RouteProductSales {
  position: number
  product_id: number
  code: string | null
  name: string
  amount: Money
  units: string
}

/** Monto atribuido de un día local de la semana: 0 domingo … 6 sábado. */
export interface RouteWeekdaySales {
  weekday: number
  amount: Money
  orders_count: number
}

/** Lo que vendió un vendedor en esta ruta, acreditado por `sale.user_id`. */
export interface RouteSellerPerformance extends RouteSeller {
  amount: Money
  orders_count: number
}

/** Clientes en la agenda de la ruta en el periodo, y cuántos compraron. */
export interface RoutePortfolioCoverage {
  scheduled_customers: number
  purchasing_customers: number
  /** `purchasing_customers / scheduled_customers × 100`. Null sin agenda. */
  rate: number | null
}

/** GET /metrics/routes/:id — el detalle de una ruta. */
export interface MetricsRouteDetailResponse extends MetricsContext {
  previous_period: MetricsRange
  route: RouteMetrics
  portfolio_coverage: RoutePortfolioCoverage
  top_customers: RouteCustomerSales[]
  top_products: RouteProductSales[]
  /** Siete baldes, ceros incluidos, domingo primero. */
  sales_by_weekday: RouteWeekdaySales[]
  seller_performance: RouteSellerPerformance[]
}

/**
 * Una jornada de la ruta (PCRM-188): su agenda de un día local y lo que salió
 * de ella. La venta se acredita a la jornada de la parada cuya visita la generó.
 */
export interface RouteWorkday {
  /** Día de la agenda, YYYY-MM-DD. */
  date: string
  /** Vendedores cuya asignación generó las paradas del día. */
  sellers: RouteSeller[]
  amount: Money
  orders_count: number
  planned_stops: number
  executed_stops: number
  /** Paradas ejecutadas con al menos una venta atribuida. */
  stops_with_order: number
  /** Clientes agendados con parada ejecutada / agendados × 100. Null sin agenda. */
  visit_coverage_rate: number | null
  /** Efectividad: `stops_with_order / executed_stops × 100`. Null sin paradas ejecutadas. */
  order_rate: number | null
}

/** Promedio de las jornadas anteriores a la última. */
export interface RouteWorkdayBaseline {
  workdays: number
  amount: Money
  orders_count: number
  visit_coverage_rate: number | null
  order_rate: number | null
}

/** GET /metrics/routes/:id/workdays — la ruta contra sí misma el mismo día de la semana. */
export interface MetricsRouteWorkdaysResponse {
  route: Pick<RouteMetrics, 'route_id' | 'name' | 'active'>
  /** Día ISO comparado: 1 lunes … 7 domingo, como `route_user.day`. */
  day: number
  limit: number
  /** La más reciente primero: es la que se compara. */
  workdays: RouteWorkday[]
  /** Null con menos de dos jornadas. */
  baseline: RouteWorkdayBaseline | null
  /** Variación % de la venta de la última jornada contra `baseline.amount`. */
  change_rate: number | null
}
