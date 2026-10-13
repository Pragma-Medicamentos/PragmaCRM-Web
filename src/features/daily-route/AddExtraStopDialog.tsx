import { useEffect, useRef, useState } from 'react'
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
import { cn } from '../../lib/utils'
import { ApiError } from '../../lib/api/apiClient'
import { todayInSv, parseDay, toDay } from '../metrics/metricsDates'
import { listCustomers } from '../customers/customersApi'
import type { Customer } from '../customers/customers.types'
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

type CustomersState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; customers: Customer[] }

/** PCRM-158: alta de una parada extra en la ruta del día de un vendedor, solo hoy o fechas futuras. */
export function AddExtraStopDialog({ sellerId, defaultDate, onClose, onCreated }: AddExtraStopDialogProps) {
  const today = parseDay(todayInSv())

  const [date, setDate] = useState(defaultDate)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customersState, setCustomersState] = useState<CustomersState>({ status: 'loading' })
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
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

  const requestId = useRef(0)

  useEffect(() => {
    const id = ++requestId.current
    setCustomersState({ status: 'loading' })

    const query = search.trim()
    const timer = setTimeout(() => {
      listCustomers(query ? { search: query, limit: 100 } : { limit: 100 })
        .then((page) => {
          if (id !== requestId.current) return
          setCustomersState({ status: 'ready', customers: page.items })
        })
        .catch((err: unknown) => {
          if (id !== requestId.current) return
          setCustomersState({
            status: 'error',
            message: err instanceof ApiError ? err.message : 'Error al cargar los clientes',
          })
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const filteredCustomers = customersState.status === 'ready' ? customersState.customers.filter((c) => c.has_gps) : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (date < todayInSv()) {
      setError('Solo se pueden agregar paradas para hoy o fechas futuras.')
      return
    }
    if (!selectedCustomer) {
      setError('Elegí un cliente.')
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
        customer_id: selectedCustomer.id,
        stop_type: stopType,
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
              <FieldLabel>Tipo de parada</FieldLabel>
              <Select value={stopType} onValueChange={(v) => setStopType(v as StopType)}>
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
              <FieldLabel>Cliente</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder="Nombre, zona o municipio"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>

              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border">
                {customersState.status === 'loading' &&
                  Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="m-1.5 h-10 rounded-md" />)}

                {customersState.status === 'error' && (
                  <p role="alert" className="p-3 text-sm text-destructive">
                    {customersState.message}
                  </p>
                )}

                {customersState.status === 'ready' && filteredCustomers.length === 0 && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <MapPinOff className="size-4 shrink-0" />
                    Ningún cliente con ubicación GPS coincide con la búsqueda.
                  </div>
                )}

                {customersState.status === 'ready' &&
                  filteredCustomers.map((customer) => {
                    const selected = customer.id === selectedCustomer?.id
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        className={cn(
                          'flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-foreground/[0.04]',
                          selected && 'bg-primary/10 hover:bg-primary/10'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{customer.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[customer.zone, customer.municipality].filter(Boolean).join(' · ') || 'Sin zona'}
                          </p>
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
                !selectedCustomer ||
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
