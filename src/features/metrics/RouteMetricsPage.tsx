import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { RouteWeekdaySalesChart } from './charts/RouteWeekdaySalesChart'
import type {
  MetricsRange,
  MetricsRouteDetailResponse,
  RouteCustomerSales,
  RouteProductSales,
} from './metrics.types'
import { getRouteDetail } from './metricsApi'
import { describeRange, formatRange } from './metricsDates'
import { computeDelta, formatCount, formatMoney, formatPercent, formatUnits, toAmount } from './metricsFormat'
import { MetricStat, MetricStatSkeleton } from './MetricStat'
import { PeriodPicker } from './PeriodPicker'
import { productMetricsPath } from './productMetricsLinks'
import { QueryAlerts } from './QueryAlerts'
import { routePlace } from './routeMetricsDisplay'
import { Refreshing, isRefreshing } from './slots'
import { useMetricsQuery } from './useMetricsQuery'
import { useMetricsSearch } from './useMetricsSearch'

function SalesSummary({ data }: { data: MetricsRouteDetailResponse | null }) {
  if (!data) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
          <MetricStatSkeleton size="hero" />
          <MetricStatSkeleton />
          <MetricStatSkeleton />
        </CardContent>
      </Card>
    )
  }

  const { route, portfolio_coverage: coverage } = data
  const delta = computeDelta('money', route.amount, route.previous_amount, 'up')

  return (
    <Card className="@container/route lg:col-span-2">
      <CardHeader>
        <CardTitle>Ventas</CardTitle>
        <CardDescription>Ventas de las paradas de la ruta, IVA incluido</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 items-start gap-x-12 gap-y-6 @2xl/route:grid-cols-[minmax(0,1fr)_auto_auto]">
        <MetricStat
          label="Venta"
          value={formatMoney(route.amount)}
          size="hero"
          delta={delta}
          comparison={`vs ${formatRange(data.previous_period)}`}
          note={`Sin venta en ${formatRange(data.previous_period)}`}
          className="col-span-2 @2xl/route:col-span-1"
        />
        <MetricStat
          label="Cobertura de visitas"
          hint="De los clientes agendados en la ruta en el periodo, cuántos tuvieron su parada ejecutada."
          value={route.visit_coverage_rate === null ? '—' : formatPercent(route.visit_coverage_rate)}
          meter={route.visit_coverage_rate}
          note={route.visit_coverage_rate === null ? 'Sin paradas agendadas' : undefined}
        />
        <MetricStat
          label="Cobertura de cartera"
          hint="De los clientes agendados en la ruta en el periodo, cuántos compraron, con visita o sin ella."
          value={coverage.rate === null ? '—' : formatPercent(coverage.rate)}
          meter={coverage.rate}
          note={
            coverage.rate === null
              ? 'Sin paradas agendadas'
              : `${formatCount(coverage.purchasing_customers)} de ${formatCount(coverage.scheduled_customers)} clientes compraron`
          }
        />
      </CardContent>
    </Card>
  )
}

/** Quién trabaja la ruta y cuánto vendió cada uno en ella; los asignados sin venta también salen. */
function SellersCard({ data }: { data: MetricsRouteDetailResponse | null }) {
  const total = toAmount(data?.route.amount) ?? 0
  const sold = new Map(data?.seller_performance.map((seller) => [seller.user_id, seller]))
  const idle = data?.route.sellers.filter((seller) => !sold.has(seller.user_id)) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendedores</CardTitle>
        <CardDescription>Quién trabaja la ruta y cuánto vendió en ella</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!data &&
          Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        {data && data.route.sellers.length === 0 && data.seller_performance.length === 0 && (
          <p className="text-sm text-muted-foreground">La ruta no tiene vendedor asignado.</p>
        )}
        {data && (
          <ul className="flex flex-col gap-5">
            {data.seller_performance.map((seller) => (
              <li key={seller.user_id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{seller.name}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(seller.amount)}</span>
                </div>
                <Progress
                  value={total > 0 ? ((toAmount(seller.amount) ?? 0) / total) * 100 : 0}
                  className="h-1.5"
                  aria-label={`Venta de ${seller.name}: ${formatMoney(seller.amount)}`}
                />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCount(seller.orders_count)} {seller.orders_count === 1 ? 'pedido' : 'pedidos'}
                </span>
              </li>
            ))}
            {idle.map((seller) => (
              <li key={seller.user_id} className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium">{seller.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">Sin venta en la ruta</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function TopCustomersTable({ customers, backTo }: { customers: RouteCustomerSales[]; backTo: string }) {
  if (customers.length === 0) {
    return <p className="px-6 text-sm text-muted-foreground">Ningún cliente compró en las paradas de la ruta.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 pl-6 text-right">#</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Pedidos</TableHead>
          <TableHead className="pr-6 text-right">Venta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.customer_id}>
            <TableCell className="pl-6 text-right text-muted-foreground tabular-nums">{customer.position}</TableCell>
            <TableCell className="w-full max-w-0">
              <Link
                to={`/clientes/${customer.customer_id}`}
                state={{ from: backTo }}
                className="block truncate font-medium hover:underline"
              >
                {customer.trade_name ?? customer.name}
              </Link>
              {customer.trade_name && <div className="truncate text-xs text-muted-foreground">{customer.name}</div>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(customer.orders_count)}</TableCell>
            <TableCell className="pr-6 text-right font-medium tabular-nums">{formatMoney(customer.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TopProductsTable({
  products,
  range,
  backTo,
}: {
  products: RouteProductSales[]
  range: MetricsRange
  backTo: string
}) {
  if (products.length === 0) {
    return <p className="px-6 text-sm text-muted-foreground">La ruta no vendió productos en este periodo.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 pl-6 text-right">#</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Unidades</TableHead>
          <TableHead className="pr-6 text-right">Venta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.product_id}>
            <TableCell className="pl-6 text-right text-muted-foreground tabular-nums">{product.position}</TableCell>
            <TableCell className="w-full max-w-0">
              <Link
                to={productMetricsPath(product.product_id, range)}
                state={{ from: backTo }}
                className="block truncate font-medium hover:underline"
              >
                {product.name}
              </Link>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatUnits(product.units)}</TableCell>
            <TableCell className="pr-6 text-right font-medium tabular-nums">{formatMoney(product.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-6">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

/**
 * Métricas de una ruta en el periodo (PCRM-178). Todo sale del historial de
 * paradas de la ruta: la venta es la de las visitas a sus paradas, aunque
 * después se haya reasignado o cambiado de clientes. El periodo vive en la
 * URL (?desde=&hasta=), igual que en /metricas.
 */
export function RouteMetricsPage() {
  const { id } = useParams<{ id: string }>()
  const { range, setRange } = useMetricsSearch()
  const location = useLocation()
  const backTo = location.pathname + location.search

  const detail = useMetricsQuery(
    id ? `${id}:${range.from}:${range.to}` : null,
    (signal) => getRouteDetail(id!, range, { signal }),
    { keepPrevious: false }
  )
  const data = detail.state.status === 'ready' ? detail.state.data : null
  const route = data?.route
  const place = route ? routePlace(route) : null

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={`/metricas?vista=rutas&desde=${range.from}&hasta=${range.to}`}>
            <ArrowLeft data-icon="inline-start" /> Volver a rutas
          </Link>
        </Button>

        <PageHeader
          title={route?.name ?? 'Ruta'}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              {route && !route.active && <Badge variant="outline">Inactiva</Badge>}
              {place && <span>{place}</span>}
              <span>{describeRange(range)}</span>
            </span>
          }
          actions={<PeriodPicker value={range} onChange={setRange} />}
        />

        <QueryAlerts
          queries={[{ label: 'las métricas de la ruta', endpoint: 'GET /api/v1/metrics/routes/:id', ...detail }]}
        />

        {detail.state.status !== 'error' && detail.state.status !== 'pending-backend' && (
          <Refreshing active={isRefreshing(detail.state)} className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <SalesSummary data={data} />
              <SellersCard data={data} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Venta por día de la semana</CardTitle>
                <CardDescription>Qué días rinde la ruta, por la fecha de cada venta</CardDescription>
              </CardHeader>
              <CardContent>
                {data ? (
                  <RouteWeekdaySalesChart weekdays={data.sales_by_weekday} />
                ) : (
                  <Skeleton className="h-44 w-full" />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Clientes que más compraron</CardTitle>
                  <CardDescription>Los 10 con más venta en las paradas de la ruta</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {data ? <TopCustomersTable customers={data.top_customers} backTo={backTo} /> : <ListSkeleton />}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Productos más vendidos</CardTitle>
                  <CardDescription>Los 10 con más venta en la ruta</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  {data ? (
                    <TopProductsTable products={data.top_products} range={range} backTo={backTo} />
                  ) : (
                    <ListSkeleton />
                  )}
                </CardContent>
              </Card>
            </div>
          </Refreshing>
        )}
      </div>
    </AppShell>
  )
}
