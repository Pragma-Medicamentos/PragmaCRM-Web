import { Info } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Skeleton } from '../../components/ui/skeleton'
import { ComparisonLegend } from './charts/ComparisonLegend'
import { PartToWholeBar } from './charts/PartToWholeBar'
import { TrendChart } from './charts/TrendChart'
import { STOP_TYPES } from './kpiCatalog'
import type { InactiveCustomer, MetricsRange, SellerDetailResponse, SellerPerformance } from './metrics.types'
import { getSellerDetail } from './metricsApi'
import { type ComparisonTarget, formatRange, formatTimestamp } from './metricsDates'
import { formatCount, formatMoney, formatPercent } from './metricsFormat'
import { MetricStat } from './MetricStat'
import { QueryAlerts } from './QueryAlerts'
import { BlockHeading, ChartSlot } from './slots'
import { SortableTable, type SortableColumn } from './SortableTable'
import { type MetricsQueryState, useMetricsQuery } from './useMetricsQuery'

/*
 * Desempeño de un vendedor (GET /metrics/sellers/:id). Lo comparten el panel
 * lateral de la pestaña Equipo (SellerDetailSheet) y la página de detalle
 * del vendedor (/vendedores/:id).
 */

export interface SellerDetailQueries {
  detail: { state: MetricsQueryState<SellerDetailResponse>; reload: () => void }
  otherDetail: { state: MetricsQueryState<SellerDetailResponse>; reload: () => void }
}

/** Detalle del periodo y, si se compara, el del periodo de comparación. `null` deja ambos en reposo. */
export function useSellerDetail(
  sellerId: string | null,
  range: MetricsRange,
  comparison: ComparisonTarget | null
): SellerDetailQueries {
  const detail = useMetricsQuery(
    sellerId ? `${sellerId}:${range.from}:${range.to}` : null,
    (signal) => getSellerDetail(sellerId!, range, { signal }),
    { keepPrevious: false }
  )

  const other = comparison?.range ?? null
  const otherDetail = useMetricsQuery(
    sellerId && other ? `${sellerId}:${other.from}:${other.to}` : null,
    (signal) => getSellerDetail(sellerId!, other!, { signal }),
    { keepPrevious: false }
  )

  return { detail, otherDetail }
}

function SellerStats({ seller }: { seller: SellerPerformance }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      <MetricStat label="Venta" value={formatMoney(seller.total_sales)} note={`${formatCount(seller.orders_count)} pedidos`} />
      <MetricStat label="Ticket promedio" value={formatMoney(seller.average_ticket)} />
      <MetricStat
        label="Venta por ruta"
        value={formatMoney(seller.sales_per_route)}
        note={`${formatCount(seller.executed_route_days)} rutas ejecutadas`}
      />
      <MetricStat
        label="Paradas"
        value={formatCount(seller.stops_executed)}
        note={`${formatCount(seller.visited_customers)} clientes visitados`}
      />
      <MetricStat
        label="Cumplimiento"
        value={formatPercent(seller.goal_compliance)}
        meter={seller.goal_compliance}
        note={seller.goal_amount === null ? 'Sin meta cargada' : `Meta: ${formatMoney(seller.goal_amount)}`}
      />
    </div>
  )
}

function InactiveCustomersTable({ customers }: { customers: InactiveCustomer[] }) {
  if (customers.length === 0) {
    return <p className="text-sm text-muted-foreground">Todos los clientes de sus rutas tienen una visita reciente.</p>
  }

  const columns: SortableColumn<InactiveCustomer>[] = [
    {
      key: 'customer',
      label: 'Cliente',
      sort: { kind: 'text', value: (customer) => customer.trade_name ?? customer.name },
      cellClassName: 'max-w-56',
      cell: (customer) => (
        <>
          <div className="truncate font-medium">{customer.trade_name ?? customer.name}</div>
          {(customer.trade_name || customer.zone) && (
            <div className="truncate text-xs text-muted-foreground">
              {[customer.trade_name ? customer.name : null, customer.zone].filter(Boolean).join(' · ')}
            </div>
          )}
        </>
      ),
    },
    {
      key: 'last_visit_at',
      label: 'Última visita',
      sort: { kind: 'date', value: (customer) => customer.last_visit_at },
      cellClassName: 'text-muted-foreground',
      cell: (customer) => formatTimestamp(customer.last_visit_at),
    },
    {
      key: 'days',
      label: 'Sin visita',
      sort: { kind: 'number', value: (customer) => customer.days_since_last_visit },
      headClassName: 'text-right',
      cellClassName: 'text-right',
      cell: (customer) => (
        <Badge variant={customer.days_since_last_visit === null ? 'destructive' : 'secondary'}>
          {customer.days_since_last_visit === null ? 'Nunca' : `${formatCount(customer.days_since_last_visit)} d`}
        </Badge>
      ),
    },
  ]

  return <SortableTable rows={customers} columns={columns} rowKey={(customer) => customer.customer_id} />
}

interface SellerPerformanceBodyProps extends SellerDetailQueries {
  /** Cifras a pintar: las del detalle, o la fila del listado mientras llega. */
  seller: SellerPerformance
  range: MetricsRange
  comparison: ComparisonTarget | null
}

/**
 * Cifras del periodo, paradas por tipo, tendencia semanal y clientes de sus
 * rutas que llevan más de N días sin visita (wireframe 1f).
 */
export function SellerPerformanceBody({ seller, range, comparison, detail, otherDetail }: SellerPerformanceBodyProps) {
  const otherData = comparison && otherDetail.state.status === 'ready' ? otherDetail.state.data : null
  const inactivityDays = detail.state.status === 'ready' ? detail.state.data.thresholds.inactivity_days : null

  return (
    <div className="flex flex-col gap-6">
      <QueryAlerts
        queries={[
          { label: 'el detalle del vendedor', endpoint: 'GET /api/v1/metrics/sellers/:id', ...detail },
          {
            label: 'el periodo de comparación',
            endpoint: 'GET /api/v1/metrics/sellers/:id (comparación)',
            ...otherDetail,
          },
        ]}
      />

      <SellerStats seller={seller} />

      <Separator />

      <div className="flex flex-col gap-3">
        <BlockHeading title="Paradas por tipo" />
        <PartToWholeBar
          noun="paradas"
          segments={STOP_TYPES.map((type) => ({ ...type, value: seller.stops_by_type[type.key] }))}
          comparison={
            comparison && otherData
              ? {
                  segments: STOP_TYPES.map((type) => ({
                    ...type,
                    value: otherData.seller.stops_by_type[type.key],
                  })),
                  label: formatRange(comparison.range),
                  currentLabel: formatRange(range),
                }
              : undefined
          }
        />
        {seller.dispatches_for_others > 0 && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {formatCount(seller.dispatches_for_others)}{' '}
            {seller.dispatches_for_others === 1 ? 'despacho fue' : 'despachos fueron'} por cuenta de otro vendedor:
            la venta se le atribuye a ese vendedor.
          </p>
        )}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <BlockHeading title="Paradas por semana" />
        <ChartSlot state={detail.state} className="h-44">
          {(data) => (
            <div className="flex flex-col gap-3">
              <TrendChart
                points={data.weekly_trend}
                granularity="week"
                metric="stops"
                kind="bar"
                comparison={
                  comparison && otherData ? { points: otherData.weekly_trend, label: comparison.label } : undefined
                }
                className="h-44"
              />
              {comparison && otherData && (
                <ComparisonLegend
                  items={[
                    { label: formatRange(range), value: formatCount(seller.stops_executed) },
                    {
                      label: formatRange(comparison.range),
                      value: formatCount(otherData.seller.stops_executed),
                      compare: true,
                    },
                  ]}
                />
              )}
            </div>
          )}
        </ChartSlot>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <BlockHeading
          title={inactivityDays ? `Clientes sin visita en ${inactivityDays} días` : 'Clientes sin visita'}
          aside="Clientes de sus rutas actuales"
        />
        {detail.state.status === 'ready' ? (
          <InactiveCustomersTable customers={detail.state.data.customers_without_visit} />
        ) : detail.state.status === 'loading' ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
