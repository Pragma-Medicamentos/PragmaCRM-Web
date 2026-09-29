import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { useCustomers } from '../customers/useCustomers'
import { useRouteStops } from './useRouteStops'
import { replaceRouteStops } from './routesApi'
import { SequenceMap } from './SequenceMap'
import { CustomerDragPreview, StopCustomerRail, customerMeta } from './StopCustomerRail'
import { StopDragPreview, StopItinerary } from './StopItinerary'
import type { DraftStop, DropIndicator } from './StopItinerary'
import type { RouteStop, StopType } from './routes.types'

type ActiveDrag = { kind: 'customer'; customerId: string } | { kind: 'stop'; customerId: string; index: number }
type OverSlot = number | 'end' | null

function toDrafts(stops: RouteStop[]): DraftStop[] {
  return stops
    .slice()
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
    .map((stop) => ({
      customer_id: stop.customer_id,
      customer_name: stop.customer_name ?? 'Sin nombre',
      stop_type: stop.stop_type,
      location: stop.location,
      has_gps: stop.location !== null,
    }))
}

function signature(stops: DraftStop[]): string {
  return stops.map((s) => `${s.customer_id}:${s.stop_type}`).join('|')
}

// El puntero decide dónde cae; el teclado no tiene puntero, así que cae al solapamiento.
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  return hits.length > 0 ? hits : rectIntersection(args)
}

function StopsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <Card className="gap-3 px-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
      <Card className="gap-0 py-0">
        <div className="border-b px-5 py-4">
          <Skeleton className="h-5 w-32" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-8 w-32" />
          </div>
        ))}
      </Card>
    </div>
  )
}

/** Editor de paradas de ruta (PCRM-141): armar el itinerario desde la lista de clientes y ver el recorrido en el mapa. */
export function RouteStopsPage() {
  const { routeId } = useParams<{ routeId: string }>()
  const navigate = useNavigate()
  const { state: customersState } = useCustomers()
  const { state: stopsState } = useRouteStops(routeId ?? '')

  const [search, setSearch] = useState('')
  const [saved, setSaved] = useState<DraftStop[]>([])
  const [stops, setStops] = useState<DraftStop[]>([])
  const [saving, setSaving] = useState(false)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [overSlot, setOverSlot] = useState<OverSlot>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    if (stopsState.status !== 'ready') return
    const drafts = toDrafts(stopsState.stops)
    setSaved(drafts)
    setStops(drafts)
  }, [stopsState])

  const dirty = signature(stops) !== signature(saved)

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const customers = useMemo(() => (customersState.status === 'ready' ? customersState.customers : []), [customersState])
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  const stopIds = useMemo(() => new Set(stops.map((s) => s.customer_id)), [stops])

  const availableCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((customer) => {
      if (stopIds.has(customer.id)) return false
      if (!query) return true
      return [customer.name, customer.zone, customer.municipality].some((field) =>
        (field ?? '').toLowerCase().includes(query)
      )
    })
  }, [customers, search, stopIds])

  function metaFor(customerId: string): string {
    const customer = customerById.get(customerId)
    return customer ? customerMeta(customer) : ''
  }

  function addCustomer(customerId: string, atIndex?: number) {
    if (stopIds.has(customerId)) return
    const customer = customerById.get(customerId)
    if (!customer) return
    const draft: DraftStop = {
      customer_id: customer.id,
      customer_name: customer.name,
      stop_type: 'visit',
      location: null,
      has_gps: customer.has_gps,
    }
    setStops((prev) => {
      const next = prev.slice()
      next.splice(atIndex ?? next.length, 0, draft)
      return next
    })
  }

  function removeStop(customerId: string) {
    setStops((prev) => prev.filter((s) => s.customer_id !== customerId))
  }

  function setStopType(customerId: string, stopType: StopType) {
    setStops((prev) => prev.map((s) => (s.customer_id === customerId ? { ...s, stop_type: stopType } : s)))
  }

  function moveStop(customerId: string, targetIndex: number) {
    setStops((prev) => {
      const fromIndex = prev.findIndex((s) => s.customer_id === customerId)
      if (fromIndex === -1 || fromIndex === targetIndex) return prev
      const next = prev.slice()
      const [moved] = next.splice(fromIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  function slotOf(event: DragOverEvent | DragEndEvent): OverSlot {
    const index = event.over?.data.current?.index as number | 'end' | undefined
    return index ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as ActiveDrag | undefined
    setActiveDrag(data ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const drag = activeDrag
    const slot = slotOf(event)
    setActiveDrag(null)
    setOverSlot(null)
    if (!drag || slot === null) return

    if (drag.kind === 'customer') {
      addCustomer(drag.customerId, slot === 'end' ? undefined : slot)
    } else {
      moveStop(drag.customerId, slot === 'end' ? stops.length - 1 : slot)
    }
  }

  function indicatorFor(index: number): DropIndicator {
    if (!activeDrag || overSlot === null) return null
    if (activeDrag.kind === 'customer') return overSlot === index ? 'before' : null
    const from = activeDrag.index
    const target = overSlot === 'end' ? stops.length - 1 : overSlot
    if (target === from || target !== index) return null
    return from < target ? 'after' : 'before'
  }

  async function handleSave() {
    if (!routeId) return
    setSaving(true)
    try {
      const result = await replaceRouteStops(
        routeId,
        stops.map((stop, index) => ({ customer_id: stop.customer_id, stop_type: stop.stop_type, sort_order: index }))
      )
      const drafts = toDrafts(result)
      setSaved(drafts)
      setStops(drafts)
      toast.success('Paradas guardadas.')
    } catch (err) {
      toast.error(
        isRouteNotImplemented(err)
          ? 'El endpoint de paradas no está disponible.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudieron guardar las paradas.'
      )
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    if (dirty) setConfirmLeave(true)
    else navigate('/rutas')
  }

  // Número = orden en la lista completa; las paradas sin coordenadas no aparecen
  // en el mapa, pero no desplazan la numeración de las que sí las tienen.
  const mapStops = stops.flatMap((stop, index) =>
    stop.location
      ? [{ key: stop.customer_id, label: stop.customer_name, location: stop.location, sequence: index + 1 }]
      : []
  )

  const activeCustomer = activeDrag?.kind === 'customer' ? customerById.get(activeDrag.customerId) : undefined
  const activeStopIndex = activeDrag?.kind === 'stop' ? stops.findIndex((s) => s.customer_id === activeDrag.customerId) : -1

  const backLink = (
    <Link
      to="/rutas"
      onClick={(e) => {
        e.preventDefault()
        goBack()
      }}
      className="-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Planificador de rutas
    </Link>
  )

  if (stopsState.status === 'not-found') {
    return (
      <AppShell>
        {backLink}
        <PageHeader title="Ruta no encontrada" subtitle="Puede que se haya desactivado o que el enlace esté incompleto." />
      </AppShell>
    )
  }

  const route = stopsState.status === 'ready' ? stopsState.route : null
  const routeMeta = route ? [route.zone, route.municipality].filter(Boolean).join(' · ') : ''
  const withoutGps = stops.filter((s) => !s.has_gps).length

  return (
    <AppShell>
      {backLink}
      <PageHeader
        title={route ? route.name : 'Paradas de la ruta'}
        subtitle={
          route
            ? [routeMeta, `${stops.length} ${stops.length === 1 ? 'parada' : 'paradas'}`].filter(Boolean).join(' · ')
            : undefined
        }
        actions={
          <>
            {dirty && (
              <>
                <span role="status" className="mr-1 hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                  <span aria-hidden className="size-2 rounded-full bg-amber-500" /> Cambios sin guardar
                </span>
                <Button type="button" variant="ghost" onClick={() => setStops(saved)} disabled={saving}>
                  Descartar
                </Button>
              </>
            )}
            <Button type="button" onClick={handleSave} disabled={saving || !dirty || !route}>
              {saving ? 'Guardando…' : 'Guardar paradas'}
            </Button>
          </>
        }
      />

      {stopsState.status === 'loading' && <StopsSkeleton />}

      {stopsState.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las paradas</AlertTitle>
          <AlertDescription>{stopsState.message}</AlertDescription>
        </Alert>
      )}

      {route && (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                'Para mover, pulsa espacio o enter. Usa las flechas para elegir la posición y vuelve a pulsar espacio o enter para soltar. Escape cancela.',
            },
            announcements: {
              onDragStart: () => 'Arrastre iniciado.',
              onDragOver: ({ over }) => (over ? 'Sobre el itinerario.' : 'Fuera del itinerario.'),
              onDragEnd: ({ over }) => (over ? 'Soltado en el itinerario.' : 'Arrastre cancelado.'),
              onDragCancel: () => 'Arrastre cancelado.',
            },
          }}
          onDragStart={handleDragStart}
          onDragOver={(event) => setOverSlot(slotOf(event))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveDrag(null)
            setOverSlot(null)
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
            <StopCustomerRail
              customersState={customersState}
              customers={availableCustomers}
              search={search}
              onSearchChange={setSearch}
              onAdd={(customerId) => addCustomer(customerId)}
            />

            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] 2xl:items-start">
              <Card className="gap-0 py-0">
                <div className="flex items-baseline justify-between gap-3 border-b px-4 pt-4 pb-3.5 sm:px-5">
                  <h2 className="text-base font-semibold text-foreground">Itinerario</h2>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {stops.length === 0
                      ? 'Orden de visita'
                      : withoutGps > 0
                        ? `${withoutGps} sin ubicación GPS`
                        : 'Todas con ubicación GPS'}
                  </p>
                </div>
                <StopItinerary
                  stops={stops}
                  metaFor={metaFor}
                  indicatorFor={indicatorFor}
                  draggingCustomer={activeDrag?.kind === 'customer'}
                  onTypeChange={setStopType}
                  onRemove={removeStop}
                />
              </Card>

              <Card className="gap-0 py-0 2xl:sticky 2xl:top-4">
                <div className="flex items-baseline justify-between gap-3 border-b px-4 pt-4 pb-3.5 sm:px-5">
                  <h2 className="text-base font-semibold text-foreground">Recorrido</h2>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {mapStops.length} de {stops.length} en el mapa
                  </p>
                </div>
                <div className="h-[22rem] 2xl:h-[min(40rem,calc(100svh-12rem))]">
                  <SequenceMap stops={mapStops} />
                </div>
              </Card>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeCustomer && <CustomerDragPreview customer={activeCustomer} />}
            {activeStopIndex >= 0 && (
              <StopDragPreview
                stop={stops[activeStopIndex]}
                sequence={activeStopIndex + 1}
                meta={metaFor(stops[activeStopIndex].customer_id)}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {confirmLeave && (
        <ConfirmDialog
          title="Salir sin guardar"
          message="Los cambios en el itinerario de esta ruta se van a perder."
          confirmLabel="Salir sin guardar"
          onCancel={() => setConfirmLeave(false)}
          onConfirm={() => navigate('/rutas')}
        />
      )}
    </AppShell>
  )
}
