import { Link } from 'react-router-dom'
import { Route as RouteIcon } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import type { MetricsRange, RouteMetrics } from './metrics.types'
import { getRouteMetrics } from './metricsApi'
import { formatRange } from './metricsDates'
import { computeDelta, formatMoney, formatPercent } from './metricsFormat'
import { DeltaBadge } from './MetricStat'
import { QueryAlerts } from './QueryAlerts'
import { hasActivity, routeMetricsPath, routePlace } from './routeMetricsDisplay'
import { Refreshing, isRefreshing } from './slots'
import { useMetricsQuery } from './useMetricsQuery'

function RouteCard({ route, range, comparison }: { route: RouteMetrics; range: MetricsRange; comparison: string }) {
  const delta = computeDelta('money', route.amount, route.previous_amount, 'up')
  const place = routePlace(route)

  return (
    <Link
      to={routeMetricsPath(route.route_id, range)}
      className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader>
          <CardTitle className="truncate">{route.name}</CardTitle>
          {place && <CardDescription className="truncate">{place}</CardDescription>}
          {!route.active && (
            <CardAction>
              <Badge variant="outline">Inactiva</Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
              {formatMoney(route.amount)}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {delta ? <DeltaBadge delta={delta} /> : <span>Sin venta en</span>}
              <span>{comparison}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Cobertura de visitas</span>
              <span className="font-medium tabular-nums">
                {route.visit_coverage_rate === null ? 'Sin agenda' : formatPercent(route.visit_coverage_rate)}
              </span>
            </div>
            <Progress
              value={route.visit_coverage_rate ?? 0}
              className="h-1.5"
              aria-label={`Cobertura de visitas de ${route.name}`}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {route.sellers.length > 0 ? (
              route.sellers.map((seller) => (
                <Badge key={seller.user_id} variant="secondary">
                  {seller.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Sin vendedor asignado</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function RouteCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-56 rounded-xl" />
      ))}
    </div>
  )
}

/**
 * Pestaña Rutas del panel (PCRM-178): una card por ruta con su venta, la
 * variación contra el periodo anterior, la cobertura de visitas y quién la
 * trabaja. Cada card abre la página de la ruta con el mismo periodo.
 */
export function RoutesTab({ range }: { range: MetricsRange }) {
  const routes = useMetricsQuery(`${range.from}:${range.to}`, (signal) => getRouteMetrics(range, { signal }))

  const data = routes.state.status === 'ready' ? routes.state.data : null
  const active = data?.routes.filter(hasActivity) ?? []
  const idle = data?.routes.filter((route) => !hasActivity(route)) ?? []
  const comparison = data ? `vs ${formatRange(data.previous_period)}` : ''

  return (
    <div className="flex flex-col gap-6">
      <QueryAlerts queries={[{ label: 'las rutas', endpoint: 'GET /api/v1/metrics/routes', ...routes }]} />

      {!data && routes.state.status === 'loading' && <RouteCardsSkeleton />}

      {data && active.length === 0 && (
        <Card>
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RouteIcon />
              </EmptyMedia>
              <EmptyTitle>Sin actividad en las rutas</EmptyTitle>
              <EmptyDescription>Ninguna ruta tuvo paradas ni ventas en este periodo. Prueba con otro rango.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      )}

      {data && active.length > 0 && (
        <Refreshing active={isRefreshing(routes.state)} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{formatMoney(data.total_amount)}</span> vendidos en las
            paradas de las rutas. No incluye las ventas sin visita.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((route) => (
              <RouteCard key={route.route_id} route={route} range={range} comparison={comparison} />
            ))}
          </div>
        </Refreshing>
      )}

      {idle.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sin actividad en el periodo</CardTitle>
            <CardDescription>Rutas sin paradas agendadas ni ventas en estas fechas ni en las anteriores</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {idle.map((route) => (
              <Badge key={route.route_id} variant="outline" asChild>
                <Link to={routeMetricsPath(route.route_id, range)}>{route.name}</Link>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
