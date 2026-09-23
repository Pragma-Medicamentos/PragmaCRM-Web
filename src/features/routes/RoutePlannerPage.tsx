import { useMemo, useState } from 'react'
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { cn } from '../../lib/utils'
import { ApiError } from '../../lib/api/apiClient'
import { useVendors } from '../vendors/useVendors'
import { useRoutePlanner } from './useRoutePlanner'
import { assignRoute, reassignRoute, unassignRouteDay } from './routesApi'
import { CreateRouteDialog } from './CreateRouteDialog'
import { SavedRoutesRail } from './SavedRoutesRail'
import { WeekGrid } from './WeekGrid'
import type { RouteAssignment } from './routes.types'

type Notice = { kind: 'success' | 'error'; message: string }

interface PendingReassign {
  assignment: RouteAssignment
  routeName: string
  newVendorId: string
  newVendorName: string
}

/** RF-04: planificador semanal de rutas por vendedor (wireframe 1g). */
export function RoutePlannerPage() {
  const { state: vendorsState } = useVendors()
  const { state: plannerState, reload } = useRoutePlanner()

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingReassign, setPendingReassign] = useState<PendingReassign | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<RouteAssignment | null>(null)
  const [busyAssignmentIds, setBusyAssignmentIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const activeVendors = vendorsState.status === 'ready' ? vendorsState.vendors.filter((v) => v.active) : []
  const vendorId = selectedVendorId ?? activeVendors[0]?.id ?? null
  const selectedVendor = activeVendors.find((v) => v.id === vendorId) ?? null

  const routes = plannerState.status === 'ready' ? plannerState.routes : []
  const assignments = plannerState.status === 'ready' ? plannerState.assignments : []
  const routesById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes])

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

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || !vendorId || submitting) return
    const routeId = event.active.id as string
    const day = event.over.data.current?.day as number | undefined
    if (!day) return

    const existing = assignments.find((a) => a.route_id === routeId && a.day === day)

    if (!existing) {
      void doAssign(routeId, day)
      return
    }
    if (existing.user_id === vendorId) {
      setNotice({ kind: 'success', message: 'Esa ruta ya está asignada a este vendedor ese día.' })
      return
    }

    setPendingReassign({
      assignment: existing,
      routeName: routesById.get(routeId)?.name ?? 'la ruta',
      newVendorId: vendorId,
      newVendorName: selectedVendor?.name ?? 'el vendedor seleccionado',
    })
  }

  async function doAssign(routeId: string, day: number) {
    if (!vendorId) return
    setNotice(null)
    setSubmitting(true)
    try {
      await assignRoute(routeId, { user_id: vendorId, day })
      reload()
    } catch (err) {
      setNotice({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'No se pudo asignar la ruta.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmReassign() {
    if (!pendingReassign) return
    const { assignment, newVendorId } = pendingReassign
    setNotice(null)
    setSubmitting(true)
    try {
      await reassignRoute(assignment.route_id, { user_id: newVendorId, day: assignment.day })
      reload()
    } catch (err) {
      setNotice({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'No se pudo reasignar la ruta.',
      })
    } finally {
      setSubmitting(false)
      setPendingReassign(null)
    }
  }

  async function confirmRemoval() {
    if (!pendingRemoval) return
    const assignment = pendingRemoval
    setNotice(null)
    setBusyAssignmentIds((prev) => new Set(prev).add(assignment.id))
    try {
      await unassignRouteDay(assignment.route_id, assignment.day)
      reload()
    } catch (err) {
      setNotice({
        kind: 'error',
        message: err instanceof ApiError ? err.message : 'No se pudo quitar la asignación.',
      })
    } finally {
      setBusyAssignmentIds((prev) => {
        const next = new Set(prev)
        next.delete(assignment.id)
        return next
      })
      setPendingRemoval(null)
    }
  }

  const ready = plannerState.status === 'ready' && vendorsState.status === 'ready'

  return (
    <AppShell>
      <PageHeader
        title="Planificador de rutas"
        subtitle={
          ready && selectedVendor
            ? `${selectedVendor.name} · ${vendorAssignments.length} ${vendorAssignments.length === 1 ? 'ruta asignada' : 'rutas asignadas'}`
            : undefined
        }
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus /> Nueva ruta
          </Button>
        }
      />

      {notice && (
        <p
          role="status"
          className={cn(
            'mb-4 rounded-lg border p-3 text-sm',
            notice.kind === 'error'
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary'
          )}
        >
          {notice.message}
        </p>
      )}

      {(plannerState.status === 'loading' || vendorsState.status === 'loading') && (
        <p className="text-sm text-muted-foreground">Cargando planificador de rutas…</p>
      )}
      {plannerState.status === 'error' && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {plannerState.message}
        </p>
      )}
      {vendorsState.status === 'error' && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {vendorsState.message}
        </p>
      )}

      {ready && activeVendors.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay vendedores activos para planificar rutas.</p>
      )}

      {ready && activeVendors.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Vendedor</span>
            <Select value={vendorId ?? undefined} onValueChange={setSelectedVendorId}>
              <SelectTrigger>
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
          </div>

          <DndContext onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <SavedRoutesRail
                routes={routes}
                assignments={assignments}
                selectedVendorId={vendorId}
                onCreateRoute={() => setCreateOpen(true)}
              />
              <WeekGrid
                assignmentsByDay={assignmentsByDay}
                routesById={routesById}
                busyAssignmentIds={busyAssignmentIds}
                onRemove={setPendingRemoval}
              />
            </div>
          </DndContext>

          <p className="text-sm text-muted-foreground">
            Arrastra una ruta guardada a un día para asignarla. La asignación es recurrente: se repite esa
            misma semana hasta que la reasignes o la quites.
          </p>
        </div>
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
          message={`"${pendingReassign.routeName}" ya está asignada ese día a otro vendedor. ¿Reasignarla a ${pendingReassign.newVendorName}?`}
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
