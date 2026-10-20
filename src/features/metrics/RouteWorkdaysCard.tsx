import { useState } from 'react'
import { Info } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { cn } from 'cn'
import type { MetricsRouteWorkdaysResponse, RouteWorkday } from './metrics.types'
import { getRouteWorkdays } from './metricsApi'
import { computeDelta, formatCount, formatMoney, formatPercent, toAmount } from './metricsFormat'
import { MetricStat, MetricStatSkeleton } from './MetricStat'
import { ComparisonLegend } from './charts/ComparisonLegend'
import { RouteWorkdaysChart } from './charts/RouteWorkdaysChart'
import { QueryAlerts } from './QueryAlerts'
import { WEEKDAY_LABELS, WEEKDAY_LABELS_SHORT } from './routeMetricsDisplay'
import { Refreshing, isRefreshing } from './slots'
import { useMetricsQuery } from './useMetricsQuery'

/** Días ISO de `route_user.day`, lunes primero. Las etiquetas están indexadas 0 domingo … 6 sábado. */
const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7] as const

/** El endpoint acepta de 2 a 12. 5 es el default; 8 y 12 alargan la comparación. */
const WORKDAY_LIMITS = [5, 8, 12] as const
const dayLabel = (isoDay: number) => WEEKDAY_LABELS[isoDay % 7]
const dayLabelShort = (isoDay: number) => WEEKDAY_LABELS_SHORT[isoDay % 7]

const workdayFormatter = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' })

/** `YYYY-MM-DD` es un día local: se arma en hora local para no correrse al día anterior. */
function formatWorkday(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return workdayFormatter.format(new Date(year, month - 1, day))
}

/** Un vendedor se lee en la celda. Varios se recortan ahí y la lista completa sale al señalarlos. */
function SellersCell({ sellers }: { sellers: RouteWorkday['sellers'] }) {
  if (sellers.length === 0) return <span className="text-muted-foreground">—</span>

  const label = sellers.map((seller) => seller.name).join(', ')
  if (sellers.length === 1) return <div className="truncate">{label}</div>

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="block w-full truncate text-left underline decoration-dotted decoration-muted-foreground/60 underline-offset-4"
          aria-label={`Vendedores de esta jornada: ${label}`}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <ul className="flex flex-col gap-0.5">
          {sellers.map((seller) => (
            <li key={seller.user_id}>{seller.name}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}

function Summary({ data }: { data: MetricsRouteWorkdaysResponse }) {
  const [latest] = data.workdays
  const { baseline } = data
  const previousLabel = baseline
    ? `vs promedio de ${formatCount(baseline.workdays)} ${baseline.workdays === 1 ? 'jornada anterior' : 'jornadas anteriores'}`
    : undefined

  return (
    <div className="grid grid-cols-2 items-start gap-x-12 gap-y-6 @2xl/workdays:grid-cols-[minmax(0,1fr)_auto_auto]">
      <MetricStat
        label={`Venta del ${formatWorkday(latest.date)}`}
        value={formatMoney(latest.amount)}
        size="hero"
        delta={baseline ? computeDelta('money', latest.amount, baseline.amount, 'up') : null}
        comparison={previousLabel}
        note={baseline ? `Promedio anterior: ${formatMoney(baseline.amount)}` : 'Sin jornadas anteriores para comparar'}
        className="col-span-2 @2xl/workdays:col-span-1"
      />
      <MetricStat
        label="Cobertura de visitas"
        hint="De los clientes agendados en la jornada, cuántos tuvieron su parada ejecutada."
        value={formatPercent(latest.visit_coverage_rate)}
        meter={latest.visit_coverage_rate}
        delta={baseline ? computeDelta('percent', latest.visit_coverage_rate, baseline.visit_coverage_rate, 'up') : null}
        comparison={baseline ? 'vs promedio' : undefined}
      />
      <MetricStat
        label="Efectividad"
        hint="De las paradas ejecutadas en la jornada, cuántas terminaron con al menos una venta."
        value={formatPercent(latest.order_rate)}
        meter={latest.order_rate}
        delta={baseline ? computeDelta('percent', latest.order_rate, baseline.order_rate, 'up') : null}
        comparison={baseline ? 'vs promedio' : undefined}
        note={latest.order_rate === null ? 'Sin paradas ejecutadas' : undefined}
      />
    </div>
  )
}

function WorkdaysTable({ workdays }: { workdays: RouteWorkday[] }) {
  const maxAmount = Math.max(0, ...workdays.map((workday) => toAmount(workday.amount) ?? 0))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 px-6">
        <h3 className="font-heading text-[0.9375rem] leading-snug font-medium">Jornadas</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label="Qué es la lista de jornadas">
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 text-pretty">
            Cada fila es un día en que la ruta tuvo agenda. La columna Vendedor muestra quién trabajó ese día. Cuando
            la misma persona cubre varios días, su nombre aparece en cada uno. Cuando dos personas cubren el mismo
            día, sus nombres aparecen juntos en esa fila. Al señalarlos se lee la lista completa, un nombre por renglón.
          </TooltipContent>
        </Tooltip>
      </div>
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-6">Jornada</TableHead>
          <TableHead>Vendedor</TableHead>
          <TableHead className="min-w-40">Venta</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Pedidos</TableHead>
          <TableHead className="hidden text-right md:table-cell">Paradas</TableHead>
          <TableHead className="hidden text-right lg:table-cell">Cobertura</TableHead>
          <TableHead className="pr-6 text-right">Efectividad</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workdays.map((workday, index) => {
          const amount = toAmount(workday.amount) ?? 0

          return (
            <TableRow key={workday.date} className={cn(index === 0 && 'bg-muted/40')}>
              <TableCell className="pl-6 whitespace-nowrap">
                <div className="font-medium tabular-nums">{formatWorkday(workday.date)}</div>
                {index === 0 && <div className="text-xs text-muted-foreground">Última jornada</div>}
              </TableCell>
              <TableCell className="max-w-48">
                <SellersCell sellers={workday.sellers} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium tabular-nums">{formatMoney(workday.amount)}</span>
                  <Progress
                    value={maxAmount > 0 ? (amount / maxAmount) * 100 : 0}
                    className="h-1.5"
                    aria-label={`Venta del ${formatWorkday(workday.date)}: ${formatMoney(workday.amount)}`}
                  />
                </div>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {formatCount(workday.orders_count)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {formatCount(workday.executed_stops)}/{formatCount(workday.planned_stops)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">
                {formatPercent(workday.visit_coverage_rate)}
              </TableCell>
              <TableCell className="pr-6 text-right tabular-nums">{formatPercent(workday.order_rate)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
    </div>
  )
}

/**
 * La ruta contra sí misma el mismo día de la semana (PCRM-188): la última
 * jornada contra el promedio de las anteriores, ej. este martes contra los
 * martes previos. No sigue el periodo de la página: siempre son las últimas
 * jornadas. Sin día elegido, el backend toma el de la última jornada.
 */
export function RouteWorkdaysCard({ routeId }: { routeId: string }) {
  const [day, setDay] = useState<number | null>(null)
  const [limit, setLimit] = useState<number>(WORKDAY_LIMITS[0])

  const workdays = useMetricsQuery(
    `${routeId}:${day ?? 'latest'}:${limit}`,
    (signal) => getRouteWorkdays(routeId, { day: day ?? undefined, limit }, { signal })
  )
  const data = workdays.state.status === 'ready' ? workdays.state.data : null
  const selectedDay = day ?? data?.day ?? null

  return (
    <Card className="@container/workdays">
      <CardHeader>
        <CardTitle>Comparar jornadas</CardTitle>
        <CardDescription>
          {selectedDay
            ? `La última jornada de los ${dayLabel(selectedDay).toLowerCase()} contra las anteriores`
            : 'La última jornada contra las anteriores del mismo día'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-0">
        <div className="flex flex-col gap-4 px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              spacing={0}
              value={selectedDay ? String(selectedDay) : ''}
              onValueChange={(value) => value && setDay(Number(value))}
              aria-label="Día de la semana"
            >
              {ISO_DAYS.map((isoDay) => (
                <ToggleGroupItem key={isoDay} value={String(isoDay)} aria-label={dayLabel(isoDay)}>
                  {dayLabelShort(isoDay)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Últimas jornadas</span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={String(limit)}
                onValueChange={(value) => value && setLimit(Number(value))}
                aria-label="Cuántas jornadas"
              >
                {WORKDAY_LIMITS.map((n) => (
                  <ToggleGroupItem key={n} value={String(n)} aria-label={`Últimas ${n} jornadas`}>
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          <QueryAlerts
            queries={[
              { label: 'las jornadas de la ruta', endpoint: 'GET /api/v1/metrics/routes/:id/workdays', ...workdays },
            ]}
          />
        </div>

        {!data && workdays.state.status === 'loading' && (
          <div className="flex flex-col gap-6 px-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <MetricStatSkeleton size="hero" />
              <MetricStatSkeleton />
              <MetricStatSkeleton />
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {data && data.workdays.length === 0 && (
          <p className="px-6 text-sm text-muted-foreground">
            La ruta no tiene jornadas los {dayLabel(data.day).toLowerCase()}.
          </p>
        )}

        {data && data.workdays.length > 0 && (
          <Refreshing active={isRefreshing(workdays.state)} className="flex flex-col gap-6">
            <div className="flex flex-col gap-6 px-6">
              <Summary data={data} />
              <div className="flex flex-col gap-3">
                <RouteWorkdaysChart workdays={data.workdays} />
                {data.workdays.length > 1 && (
                  <ComparisonLegend
                    items={[{ label: 'Última jornada' }, { label: 'Jornadas anteriores', compare: true }]}
                  />
                )}
              </div>
            </div>
            <WorkdaysTable workdays={data.workdays} />
          </Refreshing>
        )}
      </CardContent>
    </Card>
  )
}
