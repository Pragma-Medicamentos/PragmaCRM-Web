import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { ApiError } from '../../lib/api/apiClient'
import { useVendors } from '../vendors/useVendors'
import { useRoutePlanner } from './useRoutePlanner'
import { assignRoute, reassignRoute, unassignRouteDay } from './routesApi'
import { CreateRouteDialog } from './CreateRouteDialog'
import { SavedRoutesRail } from './SavedRoutesRail'
import { RouteDragPreview } from './DraggableRouteCard'
import type { DayCoverage } from './DraggableRouteCard'
import { WeekGrid } from './WeekGrid'
import type { DropHint } from './DayRow'
import { DAY_LABELS, WEEK_DAYS } from './routes.types'
import type { RouteAssignment } from './routes.types'

interface PendingReassign {
  assignment: RouteAssignment
  routeName: string
  newVendorId: string
  newVendorName: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '—'
  )
}

// getDay() cuenta desde el domingo (0); `day` del backend va de 1 = Lunes a 7 = Domingo.
const TODAY = ((new Date().getDay() + 6) % 7) + 1

function PlannerSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <Card className="gap-3 px-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Card>
      <Card className="gap-0 py-0">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        {WEEK_DAYS.map((day) => (
          <div key={day} className="flex items-center gap-6 border-b border-border/70 px-5 py-5 last:border-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </Card>
    </div>
  )
}

/** RF-04: planificador semanal de rutas por vendedor. */
export function RoutePlannerPage() {
  const { state: vendorsState } = useVendors()
  const { state: plannerState, reload } = useRoutePlanner()

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingReassign, setPendingReassign] = useState<PendingReassign | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<RouteAssignment | null>(null)
  const [busyAssignmentIds, setBusyAssignmentIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)

  // La distancia mínima deja hacer clic en "Editar paradas" sin arrancar un arrastre.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  const activeVendors = vendorsState.status === 'ready' ? vendorsState.vendors.filter((v) => v.active) : []
  const vendorId = selectedVendorId ?? activeVendors[0]?.id ?? null
  const selectedVendor = activeVendors.find((v) => v.id === vendorId) ?? null

  const routes = plannerState.status === 'ready' ? plannerState.routes : []
  const assignments = plannerState.status === 'ready' ? plannerState.assignments : []
  const routesById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes])

  const assignmentByRouteDay = useMemo(
    () => new Map(assignments.map((a) => [`${a.route_id}:${a.day}`, a])),
    [assignments]
  )

  const vendorAssignments = useMemo(
    () => assignments.filter((a) => a.user_id === vendorId),
    [assignments, vendorId]
  )
  const assignmentsByDay = useMemo(() => {
    const map = new Map<number, RouteAssignment[]>()
    for (const assignment of vendorAssignments) {
      const list = map.get(assignment.day) ?? []
      list.push(assignment)
      map.set(assignment.day, list)
    }
    return map
  }, [vendorAssignments])

  function coverageFor(routeId: string): DayCoverage[] {
    return WEEK_DAYS.map((day) => {
      const assignment = assignmentByRouteDay.get(`${routeId}:${day}`)
      if (!assignment) return { kind: 'free' }
      if (assignment.user_id === vendorId) return { kind: 'mine' }
      return { kind: 'other', vendorName: assignment.user_name }
    })
  }

  function dropHintFor(day: number): DropHint | null {
    if (!activeRouteId) return null
    const existing = assignmentByRouteDay.get(`${activeRouteId}:${day}`)
    if (!existing) return { kind: 'assign' }
    if (existing.user_id === vendorId) return { kind: 'already' }
    return { kind: 'reassign', fromVendor: existing.user_name }
  }

  const routeName = (routeId: string) => routesById.get(routeId)?.name ?? 'la ruta'

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Arrastrando ${routeName(String(active.id))}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${routeName(String(active.id))} sobre ${DAY_LABELS[(over.data.current?.day as number) - 1]}.`
        : `${routeName(String(active.id))} fuera de la semana.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${routeName(String(active.id))} soltada en ${DAY_LABELS[(over.data.current?.day as number) - 1]}.`
        : 'Arrastre cancelado.',
    onDragCancel: () => 'Arrastre cancelado.',
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveRouteId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveRouteId(null)
    if (!event.over || !vendorId || submitting) return
    const routeId = String(event.active.id)
    const day = event.over.data.current?.day as number | undefined
    if (!day) return

    const existing = assignmentByRouteDay.get(`${routeId}:${day}`)

    if (!existing) {
      void doAssign(routeId, day)
      return
    }
    if (existing.user_id === vendorId) {
      toast.info(`${routeName(routeId)} ya está asignada el ${DAY_LABELS[day - 1].toLowerCase()}.`)
      return
    }

    setPendingReassign({
      assignment: existing,
      routeName: routeName(routeId),
      newVendorId: vendorId,
      newVendorName: selectedVendor?.name ?? 'el vendedor seleccionado',
    })
  }

  async function doAssign(routeId: string, day: number) {
    if (!vendorId) return
    setSubmitting(true)
    try {
      await assignRoute(routeId, { user_id: vendorId, day })
      toast.success(`${routeName(routeId)} asignada el ${DAY_LABELS[day - 1].toLowerCase()}.`)
      reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo asignar la ruta.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmReassign() {
    if (!pendingReassign) return
    const { assignment, newVendorId, newVendorName } = pendingReassign
    setSubmitting(true)
    try {
      await reassignRoute(assignment.route_id, { user_id: newVendorId, day: assignment.day })
      toast.success(`${pendingReassign.routeName} pasó a ${newVendorName} el ${DAY_LABELS[assignment.day - 1].toLowerCase()}.`)
      reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo reasignar la ruta.')
    } finally {
      setSubmitting(false)
      setPendingReassign(null)
    }
  }

  async function confirmRemoval() {
    if (!pendingRemoval) return
    const assignment = pendingRemoval
    setBusyAssignmentIds((prev) => new Set(prev).add(assignment.id))
    try {
      await unassignRouteDay(assignment.route_id, assignment.day)
      reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo quitar la asignación.')
    } finally {
      setBusyAssignmentIds((prev) => {
        const next = new Set(prev)
        next.delete(assignment.id)
        return next
      })
      setPendingRemoval(null)
    }
  }

  const loading = plannerState.status === 'loading' || vendorsState.status === 'loading'
  const ready = plannerState.status === 'ready' && vendorsState.status === 'ready'
  const coveredDays = new Set(vendorAssignments.map((a) => a.day)).size
  const activeRoute = activeRouteId ? routesById.get(activeRouteId) : undefined

  return (
    <AppShell>
      <PageHeader
        title="Planificador de rutas"
        subtitle="Asignación semanal recurrente: se repite cada semana hasta que la cambies o la quites."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" /> Nueva ruta
          </Button>
        }
      />

      {(plannerState.status === 'error' || vendorsState.status === 'error') && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el planificador</AlertTitle>
          <AlertDescription>
            {plannerState.status === 'error' ? plannerState.message : null}
            {vendorsState.status === 'error' ? vendorsState.message : null}
          </AlertDescription>
        </Alert>
      )}

      {loading && <PlannerSkeleton />}

      {ready && activeVendors.length === 0 && (
        <Alert>
          <AlertTitle>No hay vendedores activos</AlertTitle>
          <AlertDescription>Habilita o da de alta un vendedor para empezar a planificar sus rutas.</AlertDescription>
        </Alert>
      )}

      {ready && selectedVendor && (
        <DndContext
          sensors={sensors}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                'Para mover una ruta, pulsa espacio o enter. Usa las flechas para elegir el día y vuelve a pulsar espacio o enter para soltarla. Escape cancela.',
            },
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveRouteId(null)}
        >
          <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
            <SavedRoutesRail routes={routes} coverageFor={coverageFor} onCreateRoute={() => setCreateOpen(true)} />

            <Card className="gap-0 py-0">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {initials(selectedVendor.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Select value={vendorId ?? undefined} onValueChange={setSelectedVendorId}>
                      <SelectTrigger
                        aria-label="Vendedor"
                        className="-my-0.5 -ml-2 h-auto! max-w-[calc(100%+0.625rem)] border-transparent px-2 py-0.5 text-base font-semibold text-foreground hover:bg-foreground/[0.05] dark:bg-transparent"
                      >
                        <SelectValue placeholder="Elegir vendedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeVendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {vendorAssignments.length === 1 ? '1 ruta' : `${vendorAssignments.length} rutas`} ·{' '}
                      {coveredDays} de 7 días con ruta
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Arrastra una ruta de la lista a un día para asignarla.</p>
              </div>

              <WeekGrid
                assignmentsByDay={assignmentsByDay}
                routesById={routesById}
                busyAssignmentIds={busyAssignmentIds}
                today={TODAY}
                dropHintFor={dropHintFor}
                onRemove={setPendingRemoval}
              />
            </Card>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeRoute && <RouteDragPreview route={activeRoute} coverage={coverageFor(activeRoute.id)} />}
          </DragOverlay>
        </DndContext>
      )}

      {createOpen && (
        <CreateRouteDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            reload()
          }}
        />
      )}

      {pendingReassign && (
        <ConfirmDialog
          title="Reasignar ruta"
          message={`"${pendingReassign.routeName}" ya está asignada el ${DAY_LABELS[pendingReassign.assignment.day - 1].toLowerCase()} a ${pendingReassign.assignment.user_name}. ¿Reasignarla a ${pendingReassign.newVendorName}?`}
          confirmLabel="Reasignar"
          submitting={submitting}
          onCancel={() => setPendingReassign(null)}
          onConfirm={confirmReassign}
        />
      )}

      {pendingRemoval && (
        <ConfirmDialog
          title="Quitar asignación"
          message={`${routesById.get(pendingRemoval.route_id)?.name ?? 'La ruta'} dejará de estar cubierta ese día hasta que se reasigne.`}
          confirmLabel="Quitar"
          submitting={busyAssignmentIds.has(pendingRemoval.id)}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={confirmRemoval}
        />
      )}
    </AppShell>
  )
}
