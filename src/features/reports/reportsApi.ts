import { apiDownload } from '../../lib/api/apiClient'
import type { MetricsRange, TrendGranularity } from '../metrics/metrics.types'

/*
 * Descarga de reportes (RF-09 · PCRM-159). Contrato real: PragmaCRM-Api
 * docs/REPORTS_API.md. Todo cuelga de /api/v1/reports, solo Administrador, y
 * cada reporte acepta `format=xlsx|pdf`. El éxito es el archivo, no el
 * envelope; el nombre lo pone la API (`pragma-crm_<reporte>_<from>_<to>.<ext>`).
 *
 * Hay dos familias:
 * - Panel (PCRM-162): espejan un endpoint de /metrics y solo aceptan el
 *   rango de fechas. Se consumen tal cual.
 * - Gerenciales (PCRM-159): SQL propio, aceptan además zona / vendedor /
 *   ruta (se combinan con AND). Cada uno declara cuáles aplica en `filters`.
 */

export type ReportFormat = 'xlsx' | 'pdf'

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  xlsx: 'Excel (.xlsx)',
  pdf: 'PDF',
}

export type ReportFilterKey = 'zone' | 'user_id' | 'route_id'

/** Filtros elegidos en pantalla; vacío = sin filtrar. */
export type ReportFilterValues = Partial<Record<ReportFilterKey, string>>

export type ReportSection = 'ventas' | 'clientes' | 'visitas' | 'cartera' | 'panel'

export interface ReportDefinition {
  id: string
  section: ReportSection
  title: string
  description: string
  /** Ruta bajo /api/v1/reports. */
  path: string
  /** Para el nombre de respaldo si la API no manda `Content-Disposition`. */
  slug: string
  /** Filtros que el reporte aplica; los demás no se envían. */
  filters: readonly ReportFilterKey[]
  /** Aclaración visible sobre cómo aplica el periodo o los filtros. */
  note?: string
  /** Parámetro extra que el reporte toma de la pantalla. */
  option?: 'granularity' | 'limit'
}

const ALL_FILTERS = ['zone', 'user_id', 'route_id'] as const
const NO_FILTERS = [] as const

export const REPORT_SECTIONS: { id: ReportSection; title: string; description: string }[] = [
  { id: 'ventas', title: 'Ventas', description: 'Venta confirmada del periodo por distintas dimensiones.' },
  { id: 'clientes', title: 'Clientes', description: 'Altas, regresos y clientes que dejaron de comprar.' },
  { id: 'visitas', title: 'Visitas y metas', description: 'Ejecución de la agenda, efectividad y cumplimiento.' },
  { id: 'cartera', title: 'Cobranza y cartera', description: 'Lo cobrado y los saldos de crédito.' },
  {
    id: 'panel',
    title: 'Panel de métricas',
    description: 'Las vistas del panel de métricas tal como se ven en pantalla. Solo filtran por fechas.',
  },
]

export const REPORTS: readonly ReportDefinition[] = [
  // Ventas
  {
    id: 'sales-seller',
    section: 'ventas',
    title: 'Ventas por vendedor',
    description: 'Monto, pedidos, ticket promedio y clientes de cada vendedor.',
    path: 'sales/seller',
    slug: 'ventas-por-vendedor',
    filters: ALL_FILTERS,
  },
  {
    id: 'sales-customer',
    section: 'ventas',
    title: 'Ventas por cliente',
    description: 'Monto y pedidos de cada cliente.',
    path: 'sales/customer',
    slug: 'ventas-por-cliente',
    filters: ALL_FILTERS,
  },
  {
    id: 'sales-municipality',
    section: 'ventas',
    title: 'Ventas por municipio',
    description: 'Municipio de la ruta a la que se atribuye cada venta.',
    path: 'sales/municipality',
    slug: 'ventas-por-municipio',
    filters: ALL_FILTERS,
  },
  {
    id: 'sales-route',
    section: 'ventas',
    title: 'Ventas por ruta',
    description: 'Venta atribuida a cada ruta; la venta sin visita queda como "Sin ruta atribuible".',
    path: 'sales/route',
    slug: 'ventas-por-ruta',
    filters: ALL_FILTERS,
  },
  {
    id: 'sales-zone',
    section: 'ventas',
    title: 'Ventas por zona',
    description: 'Zona de la ruta a la que se atribuye cada venta.',
    path: 'sales/zone',
    slug: 'ventas-por-zona',
    filters: ALL_FILTERS,
  },
  {
    id: 'sales-product',
    section: 'ventas',
    title: 'Ventas por producto',
    description: 'Monto, unidades y clientes de cada producto.',
    path: 'sales/product',
    slug: 'ventas-por-producto',
    filters: ALL_FILTERS,
  },
  {
    id: 'sellers-comparison',
    section: 'ventas',
    title: 'Comparativo entre vendedores',
    description: 'Venta de cada vendedor frente al periodo anterior de igual duración.',
    path: 'sales/sellers-comparison',
    slug: 'comparativo-vendedores',
    filters: ALL_FILTERS,
  },
  {
    id: 'rankings',
    section: 'ventas',
    title: 'Rankings generales',
    description: 'Vendedores, clientes y productos ordenados por monto.',
    path: 'rankings',
    slug: 'rankings',
    filters: ALL_FILTERS,
    option: 'limit',
  },
  {
    id: 'abc-customer',
    section: 'ventas',
    title: 'ABC de clientes',
    description: 'Clientes clasificados A / B / C por su aporte a la venta (80/15/5).',
    path: 'abc/customer',
    slug: 'abc-clientes',
    filters: ALL_FILTERS,
  },
  {
    id: 'abc-product',
    section: 'ventas',
    title: 'ABC de productos',
    description: 'Productos clasificados A / B / C por su aporte a la venta (80/15/5).',
    path: 'abc/product',
    slug: 'abc-productos',
    filters: ALL_FILTERS,
  },
  // Clientes
  {
    id: 'customers-new',
    section: 'clientes',
    title: 'Clientes nuevos',
    description: 'Clientes cuya primera compra confirmada cae en el periodo.',
    path: 'customers/new',
    slug: 'clientes-nuevos',
    filters: ALL_FILTERS,
  },
  {
    id: 'customers-recovered',
    section: 'clientes',
    title: 'Clientes recuperados',
    description: 'Clientes que volvieron a comprar después de un periodo de inactividad.',
    path: 'customers/recovered',
    slug: 'clientes-recuperados',
    filters: ALL_FILTERS,
  },
  {
    id: 'customers-no-purchase',
    section: 'clientes',
    title: 'Clientes sin compra (30 / 60 / 90 días)',
    description: 'Clientes activos cuya última compra tiene más de 30 días.',
    path: 'customers/no-purchase',
    slug: 'clientes-sin-compra',
    filters: ALL_FILTERS,
    note: 'Cuenta los días hasta el fin del periodo; ruta y zona usan las rutas actuales del cliente.',
  },
  // Visitas y metas
  {
    id: 'visits-planned',
    section: 'visitas',
    title: 'Visitas realizadas vs. planificadas',
    description: 'Paradas de la agenda por vendedor y ruta, y cuántas se ejecutaron.',
    path: 'visits/planned-vs-done',
    slug: 'visitas-planificadas-vs-realizadas',
    filters: ALL_FILTERS,
  },
  {
    id: 'visits-effectiveness',
    section: 'visitas',
    title: 'Efectividad de visitas',
    description: 'Visitas a clientes de cada vendedor que generaron un pedido.',
    path: 'visits/effectiveness',
    slug: 'efectividad-de-visitas',
    filters: ALL_FILTERS,
  },
  {
    id: 'goals',
    section: 'visitas',
    title: 'Cumplimiento de metas',
    description: 'Venta de cada vendedor contra su meta prorrateada al periodo.',
    path: 'goals',
    slug: 'cumplimiento-de-metas',
    filters: ['user_id'],
    note: 'Las metas son por vendedor: solo aplica el filtro de vendedor.',
  },
  // Cobranza y cartera
  {
    id: 'collections',
    section: 'cartera',
    title: 'Cobranza por vendedor',
    description: 'Lo cobrado en el periodo y los saldos pendientes y vencidos de hoy.',
    path: 'collections',
    slug: 'cobranza-por-vendedor',
    filters: ALL_FILTERS,
  },
  {
    id: 'overdue-portfolio',
    section: 'cartera',
    title: 'Cartera vencida',
    description: 'Facturas a crédito vencidas, por cliente y por antigüedad.',
    path: 'overdue-portfolio',
    slug: 'cartera-vencida',
    filters: ALL_FILTERS,
    note: 'Es una foto al día de hoy: el periodo no cambia la lista.',
  },
  // Panel de métricas (PCRM-162): solo rango de fechas
  {
    id: 'panel-kpis',
    section: 'panel',
    title: 'KPIs del panel',
    description: 'Los 17 indicadores del panel contra el periodo anterior.',
    path: 'kpis',
    slug: 'kpis',
    filters: NO_FILTERS,
  },
  {
    id: 'panel-sellers',
    section: 'panel',
    title: 'Desempeño por vendedor',
    description: 'La tabla de la pestaña Equipo: venta, paradas y meta por vendedor.',
    path: 'sellers',
    slug: 'vendedores',
    filters: NO_FILTERS,
  },
  {
    id: 'panel-trends',
    section: 'panel',
    title: 'Tendencias',
    description: 'Venta, paradas y pedidos por semana o por mes.',
    path: 'trends',
    slug: 'tendencias',
    filters: NO_FILTERS,
    option: 'granularity',
  },
  {
    id: 'panel-coverage',
    section: 'panel',
    title: 'Cobertura',
    description: 'Clientes visitados y no visitados en el periodo.',
    path: 'coverage',
    slug: 'cobertura',
    filters: NO_FILTERS,
  },
  {
    id: 'panel-products',
    section: 'panel',
    title: 'Productos más vendidos',
    description: 'Ranking de productos por monto vendido.',
    path: 'products',
    slug: 'productos',
    filters: NO_FILTERS,
    option: 'limit',
  },
  {
    id: 'panel-purchase-frequency',
    section: 'panel',
    title: 'Frecuencia de compra',
    description: 'Clientes por días entre compras.',
    path: 'purchase-frequency',
    slug: 'frecuencia-compra',
    filters: NO_FILTERS,
  },
]

export interface DownloadReportInput {
  range: MetricsRange
  format: ReportFormat
  filters?: ReportFilterValues
  granularity?: TrendGranularity
  limit?: number
}

/** Descarga un reporte enviando solo los filtros que ese reporte aplica. */
export function downloadReport(
  report: Pick<ReportDefinition, 'path' | 'slug' | 'filters' | 'option'>,
  { range, format, filters = {}, granularity, limit }: DownloadReportInput,
  { signal }: { signal?: AbortSignal } = {}
): Promise<void> {
  const params: Record<string, string | number> = { ...range, format }
  for (const key of report.filters) {
    const value = filters[key]
    if (value) params[key] = value
  }
  if (report.option === 'granularity' && granularity) params.granularity = granularity
  if (report.option === 'limit' && limit) params.limit = limit

  return apiDownload(`/api/v1/reports/${report.path}`, `pragma-crm_${report.slug}_${range.from}_${range.to}.${format}`, {
    params,
    signal,
  })
}

/** Reporte de un vendedor (PCRM-162): el detalle de la ficha, solo por fechas. */
export function sellerDetailReport(sellerId: string): Pick<ReportDefinition, 'path' | 'slug' | 'filters'> {
  return { path: `sellers/${sellerId}`, slug: 'vendedor', filters: NO_FILTERS }
}

export function reportById(id: string): ReportDefinition {
  const report = REPORTS.find((candidate) => candidate.id === id)
  if (!report) throw new Error(`Reporte desconocido: ${id}`)
  return report
}
