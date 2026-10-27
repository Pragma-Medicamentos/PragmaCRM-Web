import { useEffect, useMemo, useState } from 'react'
import { CalendarIcon, Check, MapPinOff, Search } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Field, FieldLabel } from '../../components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../components/ui/input-group'
import { Input } from '../../components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import { cn } from '../../lib/utils'
import { todayInSv, parseDay, toDay } from '../metrics/metricsDates'
import { useCustomers } from '../customers/useCustomers'
import type { Customer } from '../customers/customers.types'
import { useProspects } from '../prospects/useProspects'
import type { Prospect } from '../prospects/prospects.types'
import { STOP_TYPE_LABELS, type StopType } from '../routes/routes.types'
import { addExtraStop } from './dailyRouteApi'
import { dailyRouteErrorMessage } from './dailyRouteErrors'
import { useSellerDailyRoute } from './useSellerDailyRoute'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'long', year: 'numeric' })

interface AddExtraStopDialogProps {
  sellerId: string
  defaultDate: string
  onClose: () => void
  onCreated: () => void
}

type TargetKind = 'customer' | 'prospect'

interface TargetOption {
  id: string
  name: string
  detail: string
}

/**
 * PCRM-158: alta de una parada extra en la ruta del día de un vendedor, solo hoy o fechas futuras.
 * La parada es sobre un cliente o sobre un prospecto ("Asignar visitas únicas (clientes /
 * prospectos)"); la de un prospecto solo puede ser Visita: no tiene pedidos ni créditos.
 */
export function AddExtraStopDialog({ sellerId, defaultDate, onClose, onCreated }: AddExtraStopDialogProps) {
  const today = parseDay(todayInSv())

  const [date, setDate] = useState(defaultDate)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [targetKind, setTargetKind] = useState<TargetKind>('customer')
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [stopType, setStopType] = useState<StopType>('visit')
  const [reasonText, setReasonText] = useState('')
  const [routeId, setRouteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { state: dailyRouteState } = useSellerDailyRoute(sellerId, date)
  const routes = dailyRouteState.status === 'ready' ? dailyRouteState.route.routes : []
  const routesLoading = dailyRouteState.status === 'loading'
  const routesErrorMessage = dailyRouteState.status === 'error' ? dailyRouteState.message : null
  const noRouteThatDay = dailyRouteState.status === 'ready' && routes.length === 0
  const needsRouteSelect = routes.length > 1

  useEffect(() => {
    if (dailyRouteState.status !== 'ready') return
    if (routes.length === 1) {
      setRouteId(routes[0].id)
      return
    }
    setRouteId((prev) => (prev && routes.some((r) => r.id === prev) ? prev : null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyRouteState, date])

  // Toda la cartera (useCustomers pagina hasta el final): pedir una sola página de 100
  // dejaba fuera al resto de los ~350 clientes. Se busca en el cliente, como en RouteStopsPage.
  const { state: customersState } = useCustomers()
  const { state: prospectsState } = useProspects()

  const filteredCustomers = useMemo(() => {
    if (customersState.status !== 'ready') return []
    const query = search.trim().toLowerCase()
    return customersState.customers.filter((customer) => {
      if (!customer.has_gps) return false
      if (!query) return true
      return [customer.name, customer.zone, customer.municipality].some((field) =>
        (field ?? '').toLowerCase().includes(query)
      )
    })
  }, [customersState, search])

  // Solo prospectos con pin: la parada se dibuja en el mapa del vendedor y la API exige GPS.
  const filteredProspects = useMemo(() => {
    if (prospectsState.status !== 'ready') return []
    const query = search.trim().toLowerCase()
    return prospectsState.prospects.filter((prospect) => {
      if (!prospect.location) return false
      if (!query) return true
      return [prospect.name, prospect.seller_name].some((field) => (field ?? '').toLowerCase().includes(query))
    })
  }, [prospectsState, search])

  const isProspect = targetKind === 'prospect'
  const listState = isProspect ? prospectsState : customersState
  const options: TargetOption[] = isProspect
    ? filteredProspects.map((p) => ({
        id: p.id,
        name: p.name,
        detail: p.seller_name ? `Registrado por ${p.seller_name}` : 'Sin vendedor',
      }))
    : filteredCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        detail: [c.zone, c.municipality].filter(Boolean).join(' · ') || 'Sin zona',
      }))
  const selectedId = isProspect ? selectedProspect?.id : selectedCustomer?.id

  function handleTargetKindChange(value: string) {
    if (!value) return
    setTargetKind(value as TargetKind)
    setSearch('')
    if (value === 'prospect') setStopType('visit')
  }

  function handleSelect(id: string) {
    if (isProspect) {
      setSelectedProspect(filteredProspects.find((p) => p.id === id) ?? null)
    } else {
      setSelectedCustomer(filteredCustomers.find((c) => c.id === id) ?? null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (date < todayInSv()) {
      setError('Solo se pueden agregar paradas para hoy o fechas futuras.')
      return
    }
    const target = isProspect
      ? selectedProspect && { prospect_id: selectedProspect.id }
      : selectedCustomer && { customer_id: selectedCustomer.id }
    if (!target) {
      setError(isProspect ? 'Elegí un prospecto.' : 'Elegí un cliente.')
      return
    }
    if (noRouteThatDay) {
      setError('El vendedor no tiene ruta ese día.')
      return
    }
    if (needsRouteSelect && !routeId) {
      setError('Elegí la ruta.')
      return
    }

    const reason = reasonText.trim()

    setSubmitting(true)
    try {
      await addExtraStop(sellerId, {
        date,
        ...target,
        stop_type: isProspect ? 'visit' : stopType,
        ...(routeId ? { route_id: routeId } : {}),
        ...(reason ? { reason } : {}),
      })
      onCreated()
    } catch (err) {
      setError(dailyRouteErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Agregar parada</DialogTitle>
          </DialogHeader>

          {error && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Fecha</FieldLabel>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="justify-start font-normal">
                    <CalendarIcon data-icon="inline-start" />
                    {dateFormatter.format(parseDay(date))}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={parseDay(date)}
                    defaultMonth={parseDay(date)}
                    disabled={{ before: today }}
                    onSelect={(day) => {
                      if (!day) return
                      setDate(toDay(day))
                      setDatePopoverOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </Field>

            {noRouteThatDay && (
              <Alert variant="destructive">
                <AlertTitle>El vendedor no tiene ruta ese día.</AlertTitle>
              </Alert>
            )}

            {routesErrorMessage && (
              <Alert variant="destructive">
                <AlertTitle>No se pudieron cargar las rutas</AlertTitle>
                <AlertDescription>{routesErrorMessage}</AlertDescription>
              </Alert>
            )}

            {needsRouteSelect && (
              <Field>
                <FieldLabel>Ruta</FieldLabel>
                <Select value={routeId ?? ''} onValueChange={setRouteId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí una ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel>Parada sobre</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                value={targetKind}
                onValueChange={handleTargetKindChange}
              >
                <ToggleGroupItem value="customer">Cliente</ToggleGroupItem>
                <ToggleGroupItem value="prospect">Prospecto</ToggleGroupItem>
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel>Tipo de parada</FieldLabel>
              <Select value={stopType} onValueChange={(v) => setStopType(v as StopType)} disabled={isProspect}>
                <SelectTrigger className="w-full">
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
            </Field>

            <Field>
              <FieldLabel>Motivo (opcional)</FieldLabel>
              <Input
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                maxLength={500}
                placeholder="Ej.: cobro pendiente"
              />
            </Field>

            <Field>
              <FieldLabel>{isProspect ? 'Prospecto' : 'Cliente'}</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder={isProspect ? 'Nombre o vendedor que lo registró' : 'Nombre, zona o municipio'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>

              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border">
                {listState.status === 'loading' &&
                  Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="m-1.5 h-10 rounded-md" />)}

                {listState.status === 'error' && (
                  <p role="alert" className="p-3 text-sm text-destructive">
                    {listState.message}
                  </p>
                )}

                {listState.status === 'pending-backend' && (
                  <p className="p-3 text-sm text-muted-foreground">
                    {isProspect
                      ? 'La API todavía no expone el listado de prospectos.'
                      : 'La API todavía no expone el listado de clientes.'}
                  </p>
                )}

                {listState.status === 'ready' && options.length === 0 && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <MapPinOff className="size-4 shrink-0" />
                    {isProspect
                      ? 'Ningún prospecto con ubicación GPS coincide con la búsqueda.'
                      : 'Ningún cliente con ubicación GPS coincide con la búsqueda.'}
                  </div>
                )}

                {listState.status === 'ready' &&
                  options.map((option) => {
                    const selected = option.id === selectedId
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelect(option.id)}
                        className={cn(
                          'flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-foreground/[0.04]',
                          selected && 'bg-primary/10 hover:bg-primary/10'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{option.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{option.detail}</p>
                        </div>
                        {selected && <Check className="size-4 shrink-0 text-primary" />}
                      </button>
                    )
                  })}
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                !selectedId ||
                routesLoading ||
                noRouteThatDay ||
                !!routesErrorMessage ||
                (needsRouteSelect && !routeId)
              }
            >
              {submitting ? 'Agregando…' : 'Agregar parada'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
