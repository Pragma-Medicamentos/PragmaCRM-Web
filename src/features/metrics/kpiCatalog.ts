import type { KpiName, MetricsThresholds } from './metrics.types'
import type { MetricPolarity, MetricUnit } from './metricsFormat'

export interface KpiMeta {
  label: string
  unit: MetricUnit
  polarity: MetricPolarity
  /** Cómo se calcula, en una línea (Tooltip de la cifra). */
  hint: (thresholds: MetricsThresholds) => string
  /** Foto al día de hoy: no depende del periodo ni tiene periodo anterior. */
  snapshot?: boolean
}

/**
 * Metadatos de presentación de las KPIs del catálogo (GET /metrics/kpis).
 * `stops_by_type` no está: no es una cifra sino un desglose (StopsByTypeBar).
 * Las fórmulas resumen las de PragmaCRM-Api src/repositories/metrics/kpis/.
 */
export const KPI_META: Record<Exclude<KpiName, 'stops_by_type'>, KpiMeta> = {
  stops_executed: {
    label: 'Paradas ejecutadas',
    unit: 'count',
    polarity: 'up',
    hint: () => 'Paradas registradas en el periodo, de cualquier tipo.',
  },
  visited_customers: {
    label: 'Clientes visitados',
    unit: 'count',
    polarity: 'up',
    hint: () => 'Clientes distintos con al menos una parada en el periodo.',
  },
  effective_visits_rate: {
    label: 'Visitas efectivas',
    unit: 'percent',
    polarity: 'up',
    hint: () => 'Paradas marcadas como exitosas sobre el total de paradas.',
  },
  average_visit_minutes: {
    label: 'Duración promedio',
    unit: 'minutes',
    polarity: 'neutral',
    hint: () => 'Tiempo promedio entre el inicio y el cierre de una parada.',
  },
  total_sales: {
    label: 'Venta total',
    unit: 'money',
    polarity: 'up',
    hint: () => 'Ventas confirmadas en el ERP dentro del periodo, IVA incluido.',
  },
  orders_count: {
    label: 'Pedidos',
    unit: 'count',
    polarity: 'up',
    hint: () => 'Ventas confirmadas en el periodo.',
  },
  average_ticket: {
    label: 'Ticket promedio',
    unit: 'money',
    polarity: 'up',
    hint: () => 'Venta total entre el número de pedidos.',
  },
  average_monthly_sales: {
    label: 'Venta prom. mensual',
    unit: 'money',
    polarity: 'up',
    hint: () => 'Venta total entre los meses que toca el periodo.',
  },
  route_effectiveness: {
    label: 'Efectividad de ruta',
    unit: 'money',
    polarity: 'up',
    hint: () => 'Venta generada / ruta ejecutada (cada día de ruta de un vendedor).',
  },
  goal_compliance: {
    label: 'Cumplimiento de meta',
    unit: 'percent',
    polarity: 'up',
    hint: () => 'Venta de los vendedores con meta entre la suma de sus metas.',
  },
  customers_without_visit: {
    label: 'Clientes sin visita',
    unit: 'count',
    polarity: 'down',
    hint: (t) => `Clientes activos sin visita en los ${t.inactivity_days} días previos al cierre del periodo.`,
  },
  recovered_customers: {
    label: 'Clientes recuperados',
    unit: 'count',
    polarity: 'up',
    hint: (t) => `Clientes que volvieron a comprar después de más de ${t.inactivity_days} días sin hacerlo.`,
  },
  new_prospects: {
    label: 'Prospectos nuevos',
    unit: 'count',
    polarity: 'up',
    hint: () => 'Prospectos registrados en el periodo.',
  },
  purchase_frequency_days: {
    label: 'Frecuencia de compra',
    unit: 'days',
    polarity: 'down',
    hint: () => 'Días promedio entre compras consecutivas de un mismo cliente.',
  },
  overdue_portfolio: {
    label: 'Cartera vencida',
    unit: 'money',
    polarity: 'down',
    snapshot: true,
    hint: (t) => `Saldo pendiente con más de ${t.credit_term_days} días de emitido, sin contado. Al día de hoy.`,
  },
  pending_collections: {
    label: 'Por cobrar',
    unit: 'money',
    polarity: 'down',
    snapshot: true,
    hint: () => 'Saldo pendiente de cobro, sin ventas de contado. Al día de hoy.',
  },
}

/** Categorías de parada, en el orden fijo de la paleta (chart-1..3). */
export const STOP_TYPES = [
  { key: 'visit', label: 'Visita', color: 'var(--chart-1)' },
  { key: 'dispatch', label: 'Despacho', color: 'var(--chart-2)' },
  { key: 'collection', label: 'Cobro', color: 'var(--chart-3)' },
] as const
