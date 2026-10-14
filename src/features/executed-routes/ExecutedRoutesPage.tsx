import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CircleAlert,
  CircleCheck,
  Clock,
  ExternalLink,
  MapPin,
  MapPinOff,
  NotebookPen,
  RouteOff,
} from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../../components/ui/empty'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { cn } from '../../lib/utils'
import { PeriodPicker } from '../metrics/PeriodPicker'
import { describeRange, parseDay } from '../metrics/metricsDates'
import { SequenceMap, type SequenceMapStop } from '../routes/SequenceMap'
import { STOP_TYPE_LABELS, type StopType } from '../routes/routes.types'
import { useVendors } from '../vendors/useVendors'
import { EXECUTED_ROUTES_MAX_RANGE_DAYS } from './executedRoutes.types'
import type { ExecutedRoute, ExecutedStop } from './executedRoutes.types'
import { useExecutedRoutes, useExecutedRoutesFilters } from './useExecutedRoutes'

const ALL_SELLERS = '__all__'

const dayFormatter = new Intl.DateTimeFormat('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('es-SV', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/El_Salvador',
})

function formatDay(day: string): string {
  const label = dayFormatter.format(parseDay(day))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatTime(iso: string | null): string {
  return iso ? timeFormatter.format(new Date(iso)) : '—'
}

function stopTypeLabel(type: string | null): string {
  return type && type in STOP_TYPE_LABELS ? STOP_TYPE_LABELS[type as StopType] : 'Parada'
}

function formatCoords({ lat, lng }: { lat: number; lng: number }): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

function RouteListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}

function RouteListItem({
  route,
  selected,
  onSelect,
}: {
  route: ExecutedRoute
  selected: boolean
  onSelect: () => void
}) {
  const complete = route.stops_planned > 0 && route.stops_executed >= route.stops_planned
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected && 'border-primary bg-primary/5 hover:bg-primary/10'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-foreground">{route.route?.name ?? 'Sin ruta asignada'}</span>
        <Badge variant={complete ? 'default' : 'outline'} className="shrink-0 tabular-nums">
          {route.route
            ? `${route.stops_executed} de ${route.stops_planned}`
            : route.stops_executed === 1
              ? '1 parada'
              : `${route.stops_executed} paradas`}
        </Badge>
      </div>
      <span className="truncate text-xs text-muted-foreground">
        {route.seller.name} · {formatDay(route.date)}
      </span>
    </button>
  )
}

function StopRow({ stop, index }: { stop: ExecutedStop; index: number }) {
  return (
    <li className="flex gap-3 border-b px-4 py-3.5 last:border-b-0 sm:px-5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/clientes/${stop.customer.id}`}
            className="truncate text-sm font-semibold text-foreground hover:underline"
          >
            {stop.customer.name}
          </Link>
          <Badge variant="secondary">{stopTypeLabel(stop.stop_type)}</Badge>
          {stop.is_extra && <Badge variant="outline">Extra</Badge>}
          {stop.successful === true && (
            <Badge>
              <CircleCheck data-icon="inline-start" /> Exitosa
            </Badge>
          )}
          {stop.successful === false && <Badge variant="destructive">Sin pedido</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="size-3.5" />
            {formatTime(stop.started_at)}
            {stop.finished_at && ` – ${formatTime(stop.finished_at)}`}
          </span>
          {stop.checkin_location ? (
            <a
              href={`https://www.google.com/maps?q=${stop.checkin_location.lat},${stop.checkin_location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono tabular-nums hover:text-foreground hover:underline"
              title="Abrir en Google Maps"
            >
              <MapPin className="size-3.5" />
              {formatCoords(stop.checkin_location)}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1">
              <MapPinOff className="size-3.5" /> Sin GPS registrado
            </span>
          )}
          {stop.distance_meters !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 tabular-nums',
                stop.within_radius === false && 'text-destructive'
              )}
            >
              {stop.within_radius === false && <CircleAlert className="size-3.5" />}
              {Math.round(stop.distance_meters)} m del cliente
            </span>
          )}
        </div>

        {stop.no_order_reason && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Motivo sin pedido:</span> {stop.no_order_reason}
          </p>
        )}

        <p className={cn('flex gap-1.5 text-sm', stop.notes ? 'text-foreground' : 'text-muted-foreground italic')}>
          <NotebookPen className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 break-words whitespace-pre-line">{stop.notes ?? 'Sin nota'}</span>
        </p>
      </div>
    </li>
  )
}

function RouteDetail({ route }: { route: ExecutedRoute }) {
  const mapStops = useMemo<SequenceMapStop[]>(
    () =>
      route.stops.flatMap((stop, index) =>
        stop.checkin_location
          ? [{ key: stop.visit_id, label: stop.customer.name, location: stop.checkin_location, sequence: index + 1 }]
          : []
      ),
    [route]
  )

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{route.route?.name ?? 'Sin ruta asignada'}</h2>
          <p className="text-xs text-muted-foreground">
            {route.seller.name} · {formatDay(route.date)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {route.route
            ? `${route.stops_executed} de ${route.stops_planned} paradas planificadas ejecutadas`
            : `${route.stops_executed} paradas fuera de ruta`}
        </p>
      </div>
      <div className="h-72 border-b sm:h-80">
        <SequenceMap stops={mapStops} />
      </div>
      <ol>
        {route.stops.map((stop, index) => (
          <StopRow key={stop.visit_id} stop={stop} index={index} />
        ))}
      </ol>
    </Card>
  )
}

/**
 * HU-08: histórico de rutas ejecutadas. Cada ruta (vendedor + día + asignación)
 * lista sus paradas con la coordenada GPS del check-in y la nota (CA1), y los
 * filtros de periodo y vendedor recargan la vista desde la API (CA2).
 */
export function ExecutedRoutesPage() {
  const { filters, update } = useExecutedRoutesFilters()
  const { state, reload } = useExecutedRoutes(filters)
  const { state: vendorsState } = useVendors()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const routes = state.status === 'ready' ? state.history.routes : []
  const selected = routes.find((route) => route.key === selectedKey) ?? routes[0] ?? null

  // Un cambio de filtros vuelve a la primera ruta del nuevo resultado.
  useEffect(() => setSelectedKey(null), [filters.from, filters.to, filters.sellerId])

  const vendors = vendorsState.status === 'ready' ? vendorsState.vendors : []

  return (
    <AppShell>
      <PageHeader
        title="Rutas ejecutadas"
        subtitle={`${describeRange(filters)} · paradas con ubicación GPS y notas del vendedor`}
        actions={
          <>
            <Select
              value={filters.sellerId ?? ALL_SELLERS}
              onValueChange={(value) => update({ sellerId: value === ALL_SELLERS ? null : value })}
            >
              <SelectTrigger aria-label="Vendedor" className="min-w-48">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SELLERS}>Todos los vendedores</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PeriodPicker
              value={filters}
              onChange={(range) => update(range)}
              maxDays={EXECUTED_ROUTES_MAX_RANGE_DAYS}
            />
          </>
        }
      />

      {state.status === 'error' && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert />
          <AlertTitle>No se pudieron cargar las rutas ejecutadas</AlertTitle>
          <AlertDescription>
            <p>{state.message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={reload}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {state.status === 'loading' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
          <RouteListSkeleton />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      )}

      {state.status === 'ready' && routes.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RouteOff />
            </EmptyMedia>
            <EmptyTitle>Sin rutas ejecutadas</EmptyTitle>
            <EmptyDescription>
              No hay visitas registradas en este periodo{filters.sellerId ? ' para este vendedor' : ''}. Prueba con otro
              rango de fechas o vendedor.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {state.status === 'ready' && selected && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
          <nav aria-label="Rutas ejecutadas" className="flex flex-col gap-2 lg:sticky lg:top-20">
            <p className="text-xs text-muted-foreground tabular-nums">
              {routes.length === 1 ? '1 ruta' : `${routes.length} rutas`}
            </p>
            <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto lg:max-h-[calc(100svh-12rem)]">
              {routes.map((route) => (
                <RouteListItem
                  key={route.key}
                  route={route}
                  selected={route.key === selected.key}
                  onSelect={() => setSelectedKey(route.key)}
                />
              ))}
            </div>
          </nav>
          <RouteDetail route={selected} />
        </div>
      )}
    </AppShell>
  )
}
