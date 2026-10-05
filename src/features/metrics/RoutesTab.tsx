import { useState } from 'react'
import { ChevronRight, Route as RouteIcon } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import type { MetricsRange, RouteMetrics } from './metrics.types'
import { getRouteMetrics } from './metricsApi'
import { formatCount, formatMoney, formatPercent, formatUnits } from './metricsFormat'
import { QueryAlerts } from './QueryAlerts'
import { RouteDetailSheet } from './RouteDetailSheet'
import { routePlace } from './routeMetricsDisplay'
import { Refreshing, isRefreshing } from './slots'
import { useMetricsQuery } from './useMetricsQuery'

/**
 * Venta por día-ruta ejecutado: es dinero, no un porcentaje. `null` cuando la
 * ruta no se ejecutó ni una vez en el periodo — ahí no hay un $0.00 que
 * mostrar, no hay divisor.
 */
function EffectivenessCell({ route }: { route: RouteMetrics }) {
  if (route.effectiveness === null) return <span className="text-muted-foreground">Sin ejecución</span>
  return <span className="tabular-nums">{formatMoney(route.effectiveness)}</span>
}

function RoutesTable({ routes, onSelect }: { routes: RouteMetrics[]; onSelect: (route: RouteMetrics) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 pl-4 text-right">#</TableHead>
          <TableHead>Ruta</TableHead>
          <TableHead className="hidden xl:table-cell">Vendedores</TableHead>
          <TableHead className="text-right">Venta</TableHead>
          <TableHead className="hidden text-right lg:table-cell">Unidades</TableHead>
          <TableHead className="hidden w-16 text-right xl:table-cell">Pos. unid.</TableHead>
          <TableHead className="text-right">Venta / día-ruta</TableHead>
          <TableHead className="hidden text-right lg:table-cell">Clientes</TableHead>
          <TableHead className="text-right">Cobertura</TableHead>
          <TableHead className="hidden text-right xl:table-cell">Paradas</TableHead>
          <TableHead className="w-12 pr-4">
            <span className="sr-only">Detalle</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.map((route) => {
          const place = routePlace(route)
          return (
            <TableRow key={route.route_id} className="cursor-pointer" onClick={() => onSelect(route)}>
              {/* Las posiciones son las del API: la tabla nunca las recalcula. */}
              <TableCell className="pl-4 text-right text-muted-foreground tabular-nums">
                {formatCount(route.amount_position)}
              </TableCell>
              <TableCell className="max-w-56">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{route.name}</span>
                  {!route.active && <Badge variant="outline">Inactiva</Badge>}
                </div>
                {place && <div className="truncate text-xs text-muted-foreground">{place}</div>}
              </TableCell>
              <TableCell className="hidden max-w-48 xl:table-cell">
                {route.sellers.length > 0 ? (
                  <span className="block truncate text-sm text-muted-foreground">
                    {route.sellers.map((seller) => seller.name).join(', ')}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin vendedor</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatMoney(route.amount)}</TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatUnits(route.units)}</TableCell>
              <TableCell className="hidden text-right text-muted-foreground tabular-nums xl:table-cell">
                {formatCount(route.units_position)}
              </TableCell>
              <TableCell className="text-right">
                <EffectivenessCell route={route} />
              </TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">
                {formatCount(route.visited_customers)} / {formatCount(route.planned_customers)}
              </TableCell>
              {/* Sin agenda el API manda null y formatPercent escribe "—": un 0% diría que no se visitó a nadie. */}
              <TableCell className="text-right tabular-nums">{formatPercent(route.visit_coverage_rate)}</TableCell>
              <TableCell className="hidden text-right tabular-nums xl:table-cell">
                {formatCount(route.stops_executed)} / {formatCount(route.stops_planned)}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Ver detalle de ${route.name}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelect(route)
                  }}
                >
                  <ChevronRight />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function RoutesSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

/**
 * Pestaña Rutas (PCRM-178): el ranking de todas las rutas del periodo, con
 * el detalle de una en un panel lateral. Las cifras —posiciones,
 * efectividad, coberturas— son las que calcula el API; aquí solo se
 * formatean.
 */
export function RoutesTab({ range }: { range: MetricsRange }) {
  const routes = useMetricsQuery(`${range.from}:${range.to}`, (signal) => getRouteMetrics(range, { signal }))
  const [selected, setSelected] = useState<RouteMetrics | null>(null)

  const data = routes.state.status === 'ready' ? routes.state.data : null

  return (
    <div className="flex flex-col gap-6">
      <QueryAlerts queries={[{ label: 'las rutas', endpoint: 'GET /api/v1/metrics/routes', ...routes }]} />

      {data && data.routes.length === 0 ? (
        <Card>
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RouteIcon />
              </EmptyMedia>
              <EmptyTitle>Sin actividad en las rutas</EmptyTitle>
              <EmptyDescription>
                Ninguna ruta registró ventas ni paradas en este periodo. Prueba con otro rango.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <Refreshing active={isRefreshing(routes.state)}>
          <Card>
            <CardHeader>
              <CardTitle>Ranking de rutas</CardTitle>
              <CardDescription>
                {data
                  ? `${formatMoney(data.total_amount)} y ${formatUnits(data.total_units)} unidades atribuidos a las rutas · selecciona una para ver su detalle`
                  : 'Selecciona una ruta para ver su detalle'}
              </CardDescription>
            </CardHeader>
            <CardContent className="border-t px-0">
              {data ? (
                <RoutesTable routes={data.routes} onSelect={setSelected} />
              ) : (
                routes.state.status === 'loading' && <RoutesSkeleton />
              )}
            </CardContent>
          </Card>
        </Refreshing>
      )}

      <RouteDetailSheet route={selected} range={range} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
