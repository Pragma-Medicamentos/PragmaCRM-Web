import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CalendarIcon, MapPin, Plus, Trash2 } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Calendar } from '../../components/ui/calendar'
import { Card } from '../../components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../components/ui/empty'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '../../components/ui/item'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Skeleton } from '../../components/ui/skeleton'
import { dailyRouteErrorMessage } from './dailyRouteErrors'
import { todayInSv, parseDay, toDay } from '../metrics/metricsDates'
import { STOP_TYPE_LABELS } from '../routes/routes.types'
import { useVendors } from '../vendors/useVendors'
import { deleteExtraStop } from './dailyRouteApi'
import { useSellerDailyRoute } from './useSellerDailyRoute'
import { AddExtraStopDialog } from './AddExtraStopDialog'
import type { DailyRouteStop } from './dailyRoute.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' })

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function StopsSkeleton() {
  return (
    <Card className="gap-2 p-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </Card>
  )
}

interface StopRowProps {
  stop: DailyRouteStop
  date: string
  onDelete: (stop: DailyRouteStop) => void
  busy: boolean
}

function StopRow({ stop, date, onDelete, busy }: StopRowProps) {
  const meta = [stop.address, stop.zone, stop.municipality].filter(Boolean).join(' · ')
  const canDelete = stop.is_extra && !stop.completed_at && date >= todayInSv()

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {stop.name}
          {stop.is_extra && <Badge variant="secondary">Extra</Badge>}
        </ItemTitle>
        <ItemDescription>
          {STOP_TYPE_LABELS[stop.stop_type]}
          {meta && ` · ${meta}`}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant={stop.completed_at ? 'default' : 'outline'}>
          {stop.completed_at ? `Visitada ${timeFormatter.format(new Date(stop.completed_at))}` : 'Pendiente'}
        </Badge>
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Eliminar parada de ${stop.name}`}
            disabled={busy}
            onClick={() => onDelete(stop)}
          >
            <Trash2 />
          </Button>
        )}
      </ItemActions>
    </Item>
  )
}

/** PCRM-158: ruta del día de un vendedor, con alta y baja de paradas extra (solo hoy o futuras). */
export function SellerDailyRoutePage() {
  const { sellerId } = useParams<{ sellerId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const date = searchParams.get('fecha') && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('fecha')!)
    ? searchParams.get('fecha')!
    : todayInSv()

  const { state: vendorsState } = useVendors()
  const { state, reload } = useSellerDailyRoute(sellerId ?? '', date)

  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<DailyRouteStop | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const vendor = vendorsState.status === 'ready' ? vendorsState.vendors.find((v) => v.id === sellerId) : undefined
  const isFutureOrToday = date >= todayInSv()

  function setDate(nextDate: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('fecha', nextDate)
      return next
    })
  }

  async function handleDelete(stop: DailyRouteStop) {
    if (!sellerId) return
    setBusyId(stop.id)
    try {
      await deleteExtraStop(sellerId, stop.id)
      toast.success('Parada extra eliminada.')
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(dailyRouteErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const stops = state.status === 'ready' ? state.route.stops : []

  return (
    <AppShell>
      <Link
        to="/vendedores"
        className="-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Vendedores
      </Link>

      <PageHeader
        title={vendor ? `Ruta del día · ${vendor.name}` : 'Ruta del día'}
        subtitle={`${stops.length} ${stops.length === 1 ? 'parada' : 'paradas'}`}
        actions={
          <>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline">
                  <CalendarIcon data-icon="inline-start" />
                  {capitalize(dateFormatter.format(parseDay(date)))}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parseDay(date)}
                  defaultMonth={parseDay(date)}
                  onSelect={(day) => {
                    if (!day) return
                    setDate(toDay(day))
                    setDatePopoverOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button type="button" onClick={() => setAddOpen(true)} disabled={!isFutureOrToday}>
              <Plus data-icon="inline-start" /> Agregar parada
            </Button>
          </>
        }
      />

      {state.status === 'loading' && <StopsSkeleton />}

      {state.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar la ruta del día</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.status === 'ready' && stops.length === 0 && (
        <Card className="py-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPin />
              </EmptyMedia>
              <EmptyTitle>Sin paradas</EmptyTitle>
              <EmptyDescription>Este vendedor no tiene paradas para este día.</EmptyDescription>
            </EmptyHeader>
            {isFutureOrToday && (
              <EmptyContent>
                <Button type="button" onClick={() => setAddOpen(true)}>
                  <Plus data-icon="inline-start" /> Agregar parada
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </Card>
      )}

      {state.status === 'ready' && stops.length > 0 && (
        <div className="flex flex-col gap-2">
          {stops.map((stop) => (
            <StopRow key={stop.id} stop={stop} date={date} busy={busyId === stop.id} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {addOpen && sellerId && (
        <AddExtraStopDialog
          sellerId={sellerId}
          defaultDate={date}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false)
            toast.success('Parada extra agregada')
            reload()
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar parada"
          message={`Se va a quitar la parada extra de ${deleting.name} de la ruta de ese día.`}
          confirmLabel="Eliminar"
          submitting={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </AppShell>
  )
}
