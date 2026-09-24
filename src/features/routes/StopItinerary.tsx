import type { ComponentType } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Banknote, GripVertical, MapPinOff, Plus, Store, Truck, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { cn } from '../../lib/utils'
import { STOP_TYPE_LABELS } from './routes.types'
import type { GeoPoint, StopType } from './routes.types'

export interface DraftStop {
  customer_id: string
  customer_name: string
  stop_type: StopType
  location: GeoPoint | null
  /** Un cliente recién agregado trae `has_gps` pero no sus coordenadas: la API las devuelve al guardar. */
  has_gps: boolean
}

export const STOP_TYPES = Object.keys(STOP_TYPE_LABELS) as StopType[]

const STOP_TYPE_ICONS: Record<StopType, ComponentType<{ className?: string }>> = {
  visit: Store,
  dispatch: Truck,
  collection: Banknote,
}

export type DropIndicator = 'before' | 'after' | null

function SequenceBadge({ stop, sequence }: { stop: DraftStop; sequence: number }) {
  return (
    <span
      className={cn(
        'relative grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums',
        stop.has_gps
          ? 'bg-primary text-primary-foreground shadow-card'
          : 'border border-dashed border-muted-foreground/60 bg-card text-muted-foreground'
      )}
    >
      {sequence}
    </span>
  )
}

function StopDetails({ stop, meta, className }: { stop: DraftStop; meta: string; className?: string }) {
  const status = !stop.has_gps ? 'Sin ubicación GPS' : !stop.location ? 'Se ubica en el mapa al guardar' : null
  return (
    <div className={cn('min-w-0 flex-1 py-3', className)}>
      <p className="truncate text-sm font-medium text-foreground">{stop.customer_name}</p>
      {(meta || status) && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {!stop.has_gps && <MapPinOff aria-hidden className="size-3.5 shrink-0" />}
          <span className="truncate">{[meta, status].filter(Boolean).join(' · ')}</span>
        </p>
      )}
    </div>
  )
}

interface StopRowProps {
  stop: DraftStop
  index: number
  meta: string
  indicator: DropIndicator
  onTypeChange: (type: StopType) => void
  onRemove: () => void
}

function StopRow({ stop, index, meta, indicator, onTypeChange, onRemove }: StopRowProps) {
  const drag = useDraggable({
    id: `stop:${stop.customer_id}`,
    data: { kind: 'stop', customerId: stop.customer_id, index },
  })
  const drop = useDroppable({
    id: `slot:${stop.customer_id}`,
    data: { kind: 'slot', index },
  })

  return (
    <li
      ref={(node) => {
        drag.setNodeRef(node)
        drop.setNodeRef(node)
      }}
      className={cn(
        'group/stop relative flex items-stretch gap-1.5 pr-2 pl-1.5 sm:pr-3',
        drag.isDragging && 'opacity-40'
      )}
    >
      {indicator && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-3 z-10 h-0.5 rounded-full bg-primary',
            indicator === 'before' ? 'top-0 -translate-y-1/2' : 'bottom-0 translate-y-1/2'
          )}
        />
      )}

      <button
        type="button"
        {...drag.listeners}
        {...drag.attributes}
        aria-roledescription="parada reordenable"
        aria-label={`Mover ${stop.customer_name}, parada ${index + 1}`}
        className="flex w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/50 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <div className="relative flex w-8 shrink-0 items-center justify-center before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border group-first/stop:before:top-1/2 group-last/stop:before:bottom-1/2">
        <SequenceBadge stop={stop} sequence={index + 1} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col pb-2.5 sm:flex-row sm:items-center sm:gap-3 sm:pb-0">
        <StopDetails stop={stop} meta={meta} className="pb-1.5 sm:pb-3" />

        <div className="flex shrink-0 items-center gap-1">
          <Select value={stop.stop_type} onValueChange={(value) => onTypeChange(value as StopType)}>
            <SelectTrigger aria-label={`Tipo de parada de ${stop.customer_name}`} className="w-[10.75rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STOP_TYPES.map((type) => {
                const Icon = STOP_TYPE_ICONS[type]
                return (
                  <SelectItem key={type} value={type}>
                    <Icon className="text-muted-foreground" /> {STOP_TYPE_LABELS[type]}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Quitar ${stop.customer_name}`}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X />
          </Button>
        </div>
      </div>
    </li>
  )
}

export function StopDragPreview({ stop, sequence, meta }: { stop: DraftStop; sequence: number; meta: string }) {
  return (
    <div className="flex w-[22rem] max-w-[90vw] cursor-grabbing items-center gap-2 rounded-xl bg-card px-3 shadow-float ring-1 ring-primary/30">
      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
      <SequenceBadge stop={stop} sequence={sequence} />
      <StopDetails stop={stop} meta={meta} />
    </div>
  )
}

function EndSlot({ empty, active }: { empty: boolean; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'slot:end',
    data: { kind: 'slot', index: 'end' },
  })

  if (!empty && !active) return <div ref={setNodeRef} className="h-2" />

  return (
    <div ref={setNodeRef} className={cn('px-3 sm:px-4', empty ? 'py-4' : 'pt-1 pb-3')}>
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 text-center transition-colors duration-150',
          empty ? 'min-h-40 py-8' : 'py-3',
          isOver ? 'border-primary bg-primary/[0.07] text-primary' : 'border-border text-muted-foreground'
        )}
      >
        {empty && !active ? (
          <>
            <p className="text-sm font-medium text-foreground">La ruta todavía no tiene paradas</p>
            <p className="max-w-[26rem] text-sm text-muted-foreground">
              Arrastra clientes desde la lista, o usa{' '}
              <Plus aria-label="el botón más" className="inline size-3.5 align-[-2px]" /> para agregarlos al final.
            </p>
          </>
        ) : (
          <p className="text-sm">Soltar para agregar al final</p>
        )}
      </div>
    </div>
  )
}

interface StopItineraryProps {
  stops: DraftStop[]
  metaFor: (customerId: string) => string
  indicatorFor: (index: number) => DropIndicator
  draggingCustomer: boolean
  onTypeChange: (customerId: string, type: StopType) => void
  onRemove: (customerId: string) => void
}

/** Itinerario numerado: el orden de la lista es el orden de visita. */
export function StopItinerary({
  stops,
  metaFor,
  indicatorFor,
  draggingCustomer,
  onTypeChange,
  onRemove,
}: StopItineraryProps) {
  return (
    <div>
      {stops.length > 0 && (
        <ol aria-label="Paradas en orden de visita" className="pt-2">
          {stops.map((stop, index) => (
            <StopRow
              key={stop.customer_id}
              stop={stop}
              index={index}
              meta={metaFor(stop.customer_id)}
              indicator={indicatorFor(index)}
              onTypeChange={(type) => onTypeChange(stop.customer_id, type)}
              onRemove={() => onRemove(stop.customer_id)}
            />
          ))}
        </ol>
      )}
      <EndSlot empty={stops.length === 0} active={draggingCustomer} />
    </div>
  )
}
