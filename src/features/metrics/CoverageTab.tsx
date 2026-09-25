import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../components/ui/input-group'
import { Skeleton } from '../../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { PartToWholeBar } from './charts/PartToWholeBar'
import { CoverageMap } from './CoverageMap'
import type { CoverageCustomer, CoverageResponse, MetricsRange } from './metrics.types'
import { getCoverage } from './metricsApi'
import { formatTimestamp, parseDay, todayInSv } from './metricsDates'
import { formatCount, formatPercent } from './metricsFormat'
import { MetricStat, MetricStatSkeleton } from './MetricStat'
import { QueryAlerts } from './QueryAlerts'
import { Refreshing, isRefreshing } from './slots'
import { useMetricsQuery } from './useMetricsQuery'

function CoverageSummary({ data }: { data: CoverageResponse }) {
  const total = data.visited + data.not_visited + data.without_location
  const share = total > 0 ? Math.round((data.visited / total) * 1000) / 10 : null

  return (
    <div className="flex flex-col gap-6">
      <MetricStat
        label="Cartera visitada"
        value={formatPercent(share)}
        size="hero"
        note={`${formatCount(data.visited)} de ${formatCount(total)} clientes activos`}
      />
      <PartToWholeBar
        noun="clientes activos"
        segments={[
          { key: 'visited', label: 'Visitados', value: data.visited, color: 'var(--chart-1)' },
          { key: 'not_visited', label: 'Sin visita', value: data.not_visited, color: 'var(--chart-2)' },
          { key: 'without_location', label: 'Sin ubicación', value: data.without_location, color: 'var(--chart-4)' },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Los clientes sin ubicación GPS cuentan en el total pero no aparecen en el mapa.
      </p>
    </div>
  )
}

/** Nunca visitados primero, luego los de visita más antigua. */
function byLastVisit(a: CoverageCustomer, b: CoverageCustomer): number {
  if (a.last_visit_at === b.last_visit_at) return a.name.localeCompare(b.name)
  if (a.last_visit_at === null) return -1
  if (b.last_visit_at === null) return 1
  return a.last_visit_at.localeCompare(b.last_visit_at)
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : differenceInCalendarDays(parseDay(todayInSv()), date)
}

/**
 * Listado completo con scroll propio y encabezado fijo: la Card no crece con
 * la cartera. El contenedor de la Table de shadcn trae `overflow-x-auto`, que
 * le robaría el `sticky` al encabezado; aquí se desactiva y el scroll (en
 * ambos ejes) lo lleva el contenedor externo.
 */
function PendingCustomersTable({ customers }: { customers: CoverageCustomer[] }) {
  if (customers.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Ningún cliente coincide con la búsqueda.</p>
  }

  return (
    <div className="max-h-[28rem] overflow-auto [&>[data-slot=table-container]]:overflow-visible">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="pl-4">Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Razón social</TableHead>
            <TableHead className="hidden sm:table-cell">Última visita</TableHead>
            <TableHead className="pr-4 text-right">Sin visita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const days = daysSince(customer.last_visit_at)
            return (
              <TableRow key={customer.customer_id}>
                <TableCell className="max-w-72 pl-4">
                  <div className="truncate font-medium">{customer.trade_name ?? customer.name}</div>
                  {customer.trade_name && (
                    <div className="truncate text-xs text-muted-foreground md:hidden">{customer.name}</div>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-72 truncate text-muted-foreground md:table-cell">
                  {customer.trade_name ? customer.name : '—'}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatTimestamp(customer.last_visit_at)}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <Badge variant={days === null ? 'destructive' : 'secondary'}>
                    {days === null ? 'Nunca' : `${formatCount(days)} d`}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

/** Pestaña Cobertura (1e "Cobertura de cartera"): qué parte de la cartera se visitó y dónde está el resto. */
export function CoverageTab({ range }: { range: MetricsRange }) {
  const coverage = useMetricsQuery(`${range.from}:${range.to}`, (signal) => getCoverage(range, { signal }))
  const data = coverage.state.status === 'ready' ? coverage.state.data : null

  const pending = useMemo(() => (data ? data.customers.filter((c) => !c.visited).sort(byLastVisit) : []), [data])
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pending
    return pending.filter((c) => c.name.toLowerCase().includes(term) || c.trade_name?.toLowerCase().includes(term))
  }, [pending, search])

  return (
    <div className="flex flex-col gap-6">
      <QueryAlerts queries={[{ label: 'la cobertura', endpoint: 'GET /api/v1/metrics/coverage', ...coverage }]} />

      <Refreshing active={isRefreshing(coverage.state)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cobertura de cartera</CardTitle>
            <CardDescription>Clientes activos visitados y sin visita en el periodo</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
            {data ? (
              <CoverageSummary data={data} />
            ) : (
              <div className="flex flex-col gap-6">
                <MetricStatSkeleton size="hero" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}
            <div className="h-[26rem] overflow-hidden rounded-xl border">
              {data ? <CoverageMap customers={data.customers} /> : <Skeleton className="size-full rounded-none" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clientes sin visita</CardTitle>
            <CardDescription>
              Con ubicación GPS y sin parada en el periodo, los nunca visitados primero
              {data ? ` · ${formatCount(pending.length)} clientes` : ''}
            </CardDescription>
            {/* Título, descripción y buscador, cada uno en su fila y a todo el ancho. */}
            <InputGroup className="mt-2">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Buscar cliente"
                aria-label="Buscar cliente sin visita"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={!data || pending.length === 0}
              />
            </InputGroup>
          </CardHeader>
          <CardContent className="border-t px-0">
            {data ? (
              pending.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Todos los clientes con ubicación tienen visita en el periodo.
                </p>
              ) : (
                <PendingCustomersTable customers={filtered} />
              )
            ) : (
              <div className="flex flex-col gap-2 px-4 pt-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Refreshing>
    </div>
  )
}
