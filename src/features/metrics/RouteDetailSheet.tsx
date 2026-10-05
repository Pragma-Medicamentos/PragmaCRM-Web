import { useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Separator } from '../../components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { RouteWeekdaySalesChart } from './charts/RouteWeekdaySalesChart'
import type {
  MetricsRange,
  RouteCustomerSales,
  RouteMetrics,
  RoutePortfolioCoverage,
  RouteProductSales,
  RouteSalesTrend,
  RouteSellerPerformance,
} from './metrics.types'
import { getRouteDetail } from './metricsApi'
import { formatRange } from './metricsDates'
import { formatCount, formatMoney, formatPercent, formatUnits, type MetricDelta } from './metricsFormat'
import { DeltaBadge, MetricStat } from './MetricStat'
import { QueryAlerts } from './QueryAlerts'
import { routePlace } from './routeMetricsDisplay'
import { BlockHeading, ChartSlot } from './slots'
import { useMetricsQuery } from './useMetricsQuery'

/**
 * Variación que ya calculó el API (`previous.change_rate`), solo con su signo
 * y su tono. No se recalcula a partir de los montos.
 */
function changeDelta(rate: number): MetricDelta {
  if (Math.abs(rate) < 0.05) return { text: 'Sin cambio', direction: 'flat', tone: 'neutral' }
  const direction = rate > 0 ? 'up' : 'down'
  return { text: `${rate > 0 ? '+' : '−'}${formatPercent(Math.abs(rate))}`, direction, tone: direction === 'up' ? 'good' : 'bad' }
}

function RouteStats({ route }: { route: RouteMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      <MetricStat label="Venta" value={formatMoney(route.amount)} note={`Posición ${formatCount(route.amount_position)} por monto`} />
      <MetricStat label="Unidades" value={formatUnits(route.units)} note={`Posición ${formatCount(route.units_position)} por unidades`} />
      {/* Efectividad = venta por día-ruta ejecutado. Es dinero; sin ejecuciones no hay divisor. */}
      <MetricStat
        label="Venta por día-ruta"
        value={route.effectiveness === null ? '—' : formatMoney(route.effectiveness)}
        note={
          route.effectiveness === null
            ? 'Sin ejecución en el periodo'
            : `${formatCount(route.executed_route_days)} días-ruta ejecutados`
        }
      />
      <MetricStat
        label="Clientes visitados"
        value={formatCount(route.visited_customers)}
        note={`de ${formatCount(route.planned_customers)} planificados`}
      />
      <MetricStat
        label="Cobertura de visitas"
        value={formatPercent(route.visit_coverage_rate)}
        meter={route.visit_coverage_rate}
        note={route.visit_coverage_rate === null ? 'Sin agenda en el periodo' : undefined}
      />
      <MetricStat
        label="Paradas"
        value={formatCount(route.stops_executed)}
        note={`de ${formatCount(route.stops_planned)} planificadas`}
      />
    </div>
  )
}

function SalesTrendBlock({ previous }: { previous: RouteSalesTrend }) {
  return (
    <div className="flex flex-col gap-3">
      <BlockHeading title="Periodo anterior" aside={formatRange(previous.period)} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl leading-tight font-semibold tracking-tight tabular-nums">
          {formatMoney(previous.amount)}
        </span>
        {previous.change_rate !== null ? (
          <DeltaBadge delta={changeDelta(previous.change_rate)} />
        ) : (
          <span className="text-xs text-muted-foreground">
            Sin base de comparación: la ruta no registró venta en el periodo anterior.
          </span>
        )}
      </div>
    </div>
  )
}

function PortfolioCoverageBlock({ coverage }: { coverage: RoutePortfolioCoverage }) {
  return (
    <div className="flex flex-col gap-3">
      <BlockHeading title="Cobertura de cartera" aside="Clientes de la ruta hoy" />
      <MetricStat
        label="Clientes que compraron"
        value={`${formatCount(coverage.purchasing_customers)} / ${formatCount(coverage.assigned_customers)}`}
        meter={coverage.rate}
        // Sin cartera asignada el API manda null: formatPercent escribe "—", nunca 0%.
        note={coverage.rate === null ? 'Sin cartera asignada' : `${formatPercent(coverage.rate)} de la cartera`}
      />
    </div>
  )
}

function TopCustomersTable({ customers }: { customers: RouteCustomerSales[] }) {
  if (customers.length === 0) {
    return <p className="text-sm text-muted-foreground">Ningún cliente de la ruta compró en este periodo.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-right">#</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Pedidos</TableHead>
          <TableHead className="text-right">Venta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.customer_id}>
            <TableCell className="text-right text-muted-foreground tabular-nums">{formatCount(customer.position)}</TableCell>
            <TableCell className="max-w-56">
              <div className="truncate font-medium">{customer.trade_name ?? customer.name}</div>
              {customer.trade_name && <div className="truncate text-xs text-muted-foreground">{customer.name}</div>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(customer.orders_count)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatMoney(customer.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TopProductsTable({ products }: { products: RouteProductSales[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">La ruta no vendió productos en este periodo.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-right">#</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Unidades</TableHead>
          <TableHead className="text-right">Venta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.product_id}>
            <TableCell className="text-right text-muted-foreground tabular-nums">{formatCount(product.position)}</TableCell>
            <TableCell className="max-w-56">
              <div className="truncate font-medium">{product.name}</div>
              {product.code && <div className="truncate text-xs text-muted-foreground">{product.code}</div>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatUnits(product.units)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatMoney(product.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Lista, no gráfico: son pocos vendedores y lo que interesa es la cifra exacta de cada uno. */
function SellerPerformanceTable({ sellers }: { sellers: RouteSellerPerformance[] }) {
  if (sellers.length === 0) {
    return <p className="text-sm text-muted-foreground">Ningún vendedor registró venta en esta ruta.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendedor</TableHead>
          <TableHead className="text-right">Pedidos</TableHead>
          <TableHead className="text-right">Unidades</TableHead>
          <TableHead className="text-right">Venta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sellers.map((seller) => (
          <TableRow key={seller.user_id}>
            <TableCell className="max-w-48 truncate font-medium">{seller.name}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(seller.orders_count)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatUnits(seller.units)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatMoney(seller.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

interface RouteDetailSheetProps {
  /** Fila del ranking: pinta el encabezado y las cifras mientras llega el detalle. */
  route: RouteMetrics | null
  range: MetricsRange
  onOpenChange: (open: boolean) => void
}

/**
 * Detalle de una ruta (GET /metrics/routes/:id) en un panel lateral, con el
 * mismo patrón que SellerDetailSheet. La consulta no conserva los datos
 * anteriores: al cambiar de ruta, mostrar las cifras de otra confundiría.
 */
export function RouteDetailSheet({ route, range, onOpenChange }: RouteDetailSheetProps) {
  // Se conserva la última ruta para que el contenido no desaparezca durante
  // la animación de cierre.
  const [shown, setShown] = useState(route)
  if (route && route !== shown) setShown(route)

  const detail = useMetricsQuery(
    shown ? `${shown.route_id}:${range.from}:${range.to}` : null,
    (signal) => getRouteDetail(shown!.route_id, range, { signal }),
    { keepPrevious: false }
  )

  const data = detail.state.status === 'ready' ? detail.state.data : null
  const current = data?.route ?? shown
  const place = current && routePlace(current)
  const loading = detail.state.status === 'loading'

  return (
    <Sheet open={route !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        {current && (
          <>
            <SheetHeader className="pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg">{current.name}</SheetTitle>
                {!current.active && <Badge variant="outline">Inactiva</Badge>}
              </div>
              <SheetDescription>{[place, formatRange(range)].filter(Boolean).join(' · ')}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-6">
              <QueryAlerts
                queries={[{ label: 'el detalle de la ruta', endpoint: 'GET /api/v1/metrics/routes/:id', ...detail }]}
              />

              <RouteStats route={current} />

              <Separator />

              <div className="flex flex-col gap-3">
                <BlockHeading title="Vendedores de la ruta" />
                {current.sellers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {current.sellers.map((seller) => (
                      <Badge key={seller.user_id} variant="secondary">
                        {seller.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">La ruta no tiene vendedores asignados.</p>
                )}
              </div>

              <Separator />

              {data ? <SalesTrendBlock previous={data.previous} /> : loading && <TableSkeleton rows={1} />}

              <Separator />

              {data ? <PortfolioCoverageBlock coverage={data.portfolio_coverage} /> : loading && <TableSkeleton rows={1} />}

              <Separator />

              <div className="flex flex-col gap-3">
                <BlockHeading title="Venta por día de la semana" />
                <ChartSlot state={detail.state} className="h-44">
                  {(response) => <RouteWeekdaySalesChart weekdays={response.sales_by_weekday} />}
                </ChartSlot>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <BlockHeading title="Clientes con mayor venta" aside="Top 10" />
                {data ? <TopCustomersTable customers={data.top_customers} /> : loading && <TableSkeleton />}
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <BlockHeading title="Productos con mayor venta" aside="Top 10" />
                {data ? <TopProductsTable products={data.top_products} /> : loading && <TableSkeleton />}
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <BlockHeading title="Desempeño por vendedor" />
                {data ? <SellerPerformanceTable sellers={data.seller_performance} /> : loading && <TableSkeleton />}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
