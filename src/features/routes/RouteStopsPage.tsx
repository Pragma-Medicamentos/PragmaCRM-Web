import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GripVertical, Search, X } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { cn } from '../../lib/utils'
import { supabase } from '../../lib/supabase/client'
import { ApiError, isRouteNotImplemented } from '../../lib/api/apiClient'
import { useCustomers } from '../customers/useCustomers'
import { useRouteStops } from './useRouteStops'
import { replaceRouteStops } from './routesApi'
import { SequenceMap } from './SequenceMap'
import { STOP_TYPE_LABELS, type GeoPoint, type StopType } from './routes.types'

interface DraftStop {
  customer_id: string
  customer_name: string
  stop_type: StopType
  location: GeoPoint | null
}

const CUSTOMER_DRAG_TYPE = 'application/x-pragma-new-customer'
const STOP_DRAG_TYPE = 'application/x-pragma-reorder-stop'

/** Editor de paradas de ruta (PCRM-141): buscar/filtrar clientes, arrastrarlos a "Paradas de la ruta", reordenar, elegir tipo y ver el recorrido resultante en el mapa. */
export function RouteStopsPage() {
  const { routeId } = useParams<{ routeId: string }>()
  const navigate = useNavigate()
  const { state: customersState } = useCustomers()
  const { state: stopsState } = useRouteStops(routeId ?? '')

  const [search, setSearch] = useState('')
  const [stops, setStops] = useState<DraftStop[]>([])
  const [draggingCustomerId, setDraggingCustomerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (stopsState.status !== 'ready') return
    setStops(
      stopsState.stops
        .slice()
        .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
        .map((stop) => ({
          customer_id: stop.customer_id,
          customer_name: stop.customer_name ?? 'Sin nombre',
          stop_type: stop.stop_type,
          location: stop.location,
        }))
    )
  }, [stopsState])

  const stopIds = useMemo(() => new Set(stops.map((s) => s.customer_id)), [stops])

  const availableCustomers = useMemo(() => {
    if (customersState.status !== 'ready') return []
    const query = search.trim().toLowerCase()
    return customersState.customers.filter((customer) => {
      if (stopIds.has(customer.id)) return false
      if (!query) return true
      return (
        customer.name.toLowerCase().includes(query) ||
        (customer.zone ?? '').toLowerCase().includes(query) ||
        (customer.municipality ?? '').toLowerCase().includes(query)
      )
    })
  }, [customersState, search, stopIds])

  function addCustomer(customerId: string) {
    if (customersState.status !== 'ready' || stopIds.has(customerId)) return
    const customer = customersState.customers.find((c) => c.id === customerId)
    if (!customer) return
    setStops((prev) => [...prev, { customer_id: customer.id, customer_name: customer.name, stop_type: 'visit', location: null }])
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

  async function handleSave() {
    if (!routeId) return
    setSaving(true)
    setNotice(null)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token ?? null
      const result = await replaceRouteStops(
        token,
        routeId,
        stops.map((stop, index) => ({ customer_id: stop.customer_id, stop_type: stop.stop_type, sort_order: index }))
      )
      setStops(
        result
          .slice()
          .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
          .map((stop) => ({
            customer_id: stop.customer_id,
            customer_name: stop.customer_name ?? 'Sin nombre',
            stop_type: stop.stop_type,
            location: stop.location,
          }))
      )
      setNotice({ kind: 'success', message: 'Paradas guardadas.' })
    } catch (err) {
      if (isRouteNotImplemented(err)) {
        setNotice({ kind: 'error', message: 'El endpoint de paradas no está disponible.' })
      } else {
        setNotice({ kind: 'error', message: err instanceof ApiError ? err.message : 'No se pudieron guardar las paradas.' })
      }
    } finally {
      setSaving(false)
    }
  }

  // Número = orden en la lista completa; paradas sin GPS no aparecen en el mapa
  // pero no desplazan la numeración de las que sí tienen coords.
  const mapStops = stops
    .map((s, index) => ({ stop: s, sequence: index + 1 }))
    .filter((entry): entry is { stop: DraftStop & { location: GeoPoint }; sequence: number } => entry.stop.location !== null)
    .map(({ stop, sequence }) => ({
      key: stop.customer_id,
      label: stop.customer_name,
      location: stop.location,
      sequence,
    }))

  if (stopsState.status === 'not-found') {
    return (
      <AppShell>
        <PageHeader title="Ruta no encontrada" />
        <Button type="button" variant="outline" onClick={() => navigate('/rutas')}>
          Volver al planificador
        </Button>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader
        title={stopsState.status === 'ready' ? `Paradas de ${stopsState.route.name}` : 'Paradas de la ruta'}
        subtitle={stopsState.status === 'ready' ? `${stops.length} ${stops.length === 1 ? 'parada' : 'paradas'}` : undefined}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => navigate('/rutas')}>
              Volver
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || stopsState.status !== 'ready'}>
              {saving ? 'Guardando…' : 'Guardar paradas'}
            </Button>
          </>
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

      {stopsState.status === 'loading' && <p className="text-sm text-muted-foreground">Cargando paradas…</p>}
      {stopsState.status === 'error' && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {stopsState.message}
        </p>
      )}

      {stopsState.status === 'ready' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="px-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Clientes disponibles
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre, zona o municipio"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto rounded-lg border border-border p-1.5">
              {customersState.status === 'loading' && (
                <p className="p-2 text-xs text-muted-foreground">Cargando clientes…</p>
              )}
              {customersState.status === 'pending-backend' && (
                <p className="p-2 text-xs text-muted-foreground">Falta el endpoint de clientes en la Api.</p>
              )}
              {customersState.status === 'ready' && availableCustomers.length === 0 && (
                <p className="p-2 text-xs text-muted-foreground">Ningún cliente disponible coincide.</p>
              )}
              {availableCustomers.map((customer) => (
                <div
                  key={customer.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(CUSTOMER_DRAG_TYPE, customer.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="flex cursor-grab items-center justify-between gap-2 rounded-lg border border-border bg-background p-2 text-sm active:cursor-grabbing"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{customer.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[customer.zone, customer.municipality].filter(Boolean).join(' · ') || 'Sin zona'}
                      {!customer.has_gps && ' · sin GPS'}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addCustomer(customer.id)}>
                    Agregar
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col gap-2"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(CUSTOMER_DRAG_TYPE)) e.preventDefault()
            }}
            onDrop={(e) => {
              const customerId = e.dataTransfer.getData(CUSTOMER_DRAG_TYPE)
              if (customerId) addCustomer(customerId)
            }}
          >
            <p className="px-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Paradas de la ruta
            </p>
            <div className="flex min-h-40 max-h-[28rem] flex-col gap-1.5 overflow-y-auto rounded-lg border border-dashed border-border p-1.5">
              {stops.length === 0 && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  Arrastra clientes aquí, o usá "Agregar" en la lista de la izquierda.
                </p>
              )}
              {stops.map((stop, index) => (
                <div
                  key={stop.customer_id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingCustomerId(stop.customer_id)
                    e.dataTransfer.setData(STOP_DRAG_TYPE, stop.customer_id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => setDraggingCustomerId(null)}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes(STOP_DRAG_TYPE)) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    e.stopPropagation()
                    const draggedId = e.dataTransfer.getData(STOP_DRAG_TYPE) || draggingCustomerId
                    if (draggedId) moveStop(draggedId, index)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm',
                    draggingCustomerId === stop.customer_id && 'opacity-50'
                  )}
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{stop.customer_name || 'Sin nombre'}</p>
                    {!stop.location && <p className="text-xs text-muted-foreground">Sin ubicación GPS</p>}
                  </div>
                  <Select value={stop.stop_type} onValueChange={(v) => setStopType(stop.customer_id, v as StopType)}>
                    <SelectTrigger className="w-32 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STOP_TYPE_LABELS) as StopType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {STOP_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.customer_id)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar ${stop.customer_name || 'Sin nombre'}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="px-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Recorrido resultante
            </p>
            <div className="h-[28rem]">
              <SequenceMap stops={mapStops} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

