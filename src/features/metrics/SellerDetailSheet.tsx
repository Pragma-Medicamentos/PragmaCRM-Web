import { useState } from 'react'
import { Info } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ComparisonLegend } from './charts/ComparisonLegend'
import { PartToWholeBar } from './charts/PartToWholeBar'
import { TrendChart } from './charts/TrendChart'
import { STOP_TYPES } from './kpiCatalog'
import type { InactiveCustomer, MetricsRange, SellerPerformance } from './metrics.types'
import { getSellerDetail } from './metricsApi'
import { type ComparisonTarget, formatRange, formatTimestamp } from './metricsDates'
import { formatCount, formatMoney, formatPercent } from './metricsFormat'
import { MetricStat } from './MetricStat'
import { QueryAlerts } from './QueryAlerts'
import { BlockHeading, ChartSlot } from './slots'
import { useMetricsQuery } from './useMetricsQuery'

interface SellerDetailSheetProps {
  /** Fila del listado: pinta el encabezado y las cifras mientras llega el detalle. */
  seller: SellerPerformance | null
  range: MetricsRange
  /** Periodo que los gráficos del detalle dibujan en gris; `null` sin comparar. */
  comparison: ComparisonTarget | null
  onOpenChange: (open: boolean) => void
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Última visita</TableHead>
          <TableHead className="text-right">Sin visita</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.customer_id}>
            <TableCell className="max-w-56">
              <div className="truncate font-medium">{customer.trade_name ?? customer.name}</div>
              {(customer.trade_name || customer.zone) && (
                <div className="truncate text-xs text-muted-foreground">
                  {[customer.trade_name ? customer.name : null, customer.zone].filter(Boolean).join(' · ')}
                </div>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatTimestamp(customer.last_visit_at)}</TableCell>
            <TableCell className="text-right">
              <Badge variant={customer.days_since_last_visit === null ? 'destructive' : 'secondary'}>
                {customer.days_since_last_visit === null ? 'Nunca' : `${formatCount(customer.days_since_last_visit)} d`}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * Detalle de un vendedor (wireframe 1f, "fila expandible") en un panel
 * lateral: cifras del periodo, paradas por tipo, tendencia semanal y los
 * clientes de sus rutas que llevan más de N días sin visita.
 */
export function SellerDetailSheet({ seller, range, comparison, onOpenChange }: SellerDetailSheetProps) {
  // Se conserva el último vendedor para que el contenido no desaparezca
  // durante la animación de cierre.
  const [shown, setShown] = useState(seller)
  if (seller && seller !== shown) setShown(seller)

  const detail = useMetricsQuery(
    shown ? `${shown.user_id}:${range.from}:${range.to}` : null,
    (signal) => getSellerDetail(shown!.user_id, range, { signal }),
    { keepPrevious: false }
  )

  const other = comparison?.range ?? null
  const otherDetail = useMetricsQuery(
    shown && other ? `${shown.user_id}:${other.from}:${other.to}` : null,
    (signal) => getSellerDetail(shown!.user_id, other!, { signal }),
    { keepPrevious: false }
  )
  const otherData = comparison && otherDetail.state.status === 'ready' ? otherDetail.state.data : null

  const current = detail.state.status === 'ready' ? detail.state.data.seller : shown
  const inactivityDays = detail.state.status === 'ready' ? detail.state.data.thresholds.inactivity_days : null

  return (
    <Sheet open={seller !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        {current && (
          <>
            <SheetHeader className="pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg">{current.name}</SheetTitle>
                {!current.active && <Badge variant="outline">Deshabilitado</Badge>}
              </div>
              <SheetDescription>
                {formatCount(current.portfolio_customers)} clientes en cartera · {formatRange(range)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-6">
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

              <SellerStats seller={current} />

              <Separator />

              <div className="flex flex-col gap-3">
                <BlockHeading title="Paradas por tipo" />
                <PartToWholeBar
                  noun="paradas"
                  segments={STOP_TYPES.map((type) => ({ ...type, value: current.stops_by_type[type.key] }))}
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
                {current.dispatches_for_others > 0 && (
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-px size-3.5 shrink-0" aria-hidden />
                    {formatCount(current.dispatches_for_others)}{' '}
                    {current.dispatches_for_others === 1 ? 'despacho fue' : 'despachos fueron'} por cuenta de otro vendedor:
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
                            { label: formatRange(range), value: formatCount(current.stops_executed) },
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
