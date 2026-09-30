import { useDroppable } from '@dnd-kit/core'
import { ArrowRightLeft, Check, CornerDownLeft, Plus } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { cn } from '../../lib/utils'
import { ExtraStopChip } from './ExtraStopChip'
import { RouteAssignmentCard } from './RouteAssignmentCard'
import { DAY_LABELS } from './routes.types'
import type { Route, RouteAssignment } from './routes.types'
import type { DailyRouteStop } from '../daily-route/dailyRoute.types'

export type DropHint = { kind: 'assign' } | { kind: 'reassign'; fromVendor: string } | { kind: 'already' }

interface DayRowProps {
  day: number
  /** Fecha de este día en la semana que se está viendo, ya formateada ("29 sep"). */
  dateLabel: string
  isToday: boolean
  isPast: boolean
  assignments: RouteAssignment[]
  routesById: Map<string, Route>
  busyAssignmentIds: Set<string>
  onRemove: (assignment: RouteAssignment) => void
  /** Paradas extra de esa fecha; null mientras cargan. */
  extras: DailyRouteStop[] | null
  busyExtraIds: Set<string>
  onAddExtra: () => void
  onRemoveExtra: (stop: DailyRouteStop) => void
  linkState: unknown
  /** Qué pasaría al soltar aquí la ruta que se está arrastrando; null si no se arrastra nada. */
  dropHint: DropHint | null
}

// Flota sobre la fila en vez de ocupar lugar: si empujara el contenido, las filas cambiarían de alto a mitad del arrastre.
function DropBadge({ hint }: { hint: DropHint }) {
  const base =
    'pointer-events-none absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-float sm:right-5'
  if (hint.kind === 'already') {
    return (
      <span className={cn(base, 'bg-card text-muted-foreground ring-1 ring-border')}>
        <Check className="size-3.5" /> Ya asignada este día
      </span>
    )
  }
  return (
    <span className={cn(base, 'bg-primary text-primary-foreground')}>
      {hint.kind === 'reassign' ? (
        <>
          <ArrowRightLeft className="size-3.5" /> Reasignar desde {hint.fromVendor}
        </>
      ) : (
        <>
          <CornerDownLeft className="size-3.5" /> Asignar
        </>
      )}
    </span>
  )
}

/** Fila de un día de la semana: zona de destino para soltar una ruta, y paradas extra de esa fecha. */
export function DayRow({
  day,
  dateLabel,
  isToday,
  isPast,
  assignments,
  routesById,
  busyAssignmentIds,
  onRemove,
  extras,
  busyExtraIds,
  onAddExtra,
  onRemoveExtra,
  linkState,
  dropHint,
}: DayRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}`, data: { day } })
  const count = assignments.length
  const canAddExtra = count > 0 && !isPast

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'relative grid min-h-[4.25rem] grid-cols-1 items-center gap-2 px-4 py-3 transition-colors duration-150 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:gap-3 sm:py-2.5 sm:px-5',
        isOver && dropHint && 'bg-primary/[0.07] shadow-[inset_0_0_0_1.5px_var(--color-primary)]'
      )}
    >
      <div className="flex items-center gap-2 sm:block">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-semibold', count ? 'text-foreground' : 'text-muted-foreground')}>
            {DAY_LABELS[day - 1]}
          </p>
          {isToday && <Badge>Hoy</Badge>}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {dateLabel} · {count === 0 ? 'Libre' : count === 1 ? '1 ruta' : `${count} rutas`}
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {assignments.map((assignment) => (
          <RouteAssignmentCard
            key={assignment.id}
            route={routesById.get(assignment.route_id)}
            linkState={linkState}
            busy={busyAssignmentIds.has(assignment.id)}
            onRemove={() => onRemove(assignment)}
          />
        ))}
        {count > 0 && extras === null && <Skeleton className="h-[2.625rem] w-32 rounded-lg" />}
        {extras?.map((stop) => (
          <ExtraStopChip
            key={stop.id}
            stop={stop}
            busy={busyExtraIds.has(stop.id)}
            onRemove={isPast ? null : () => onRemoveExtra(stop)}
          />
        ))}
        {count === 0 && (
          <span className="text-sm text-muted-foreground">{dropHint ? 'Soltar aquí' : 'Sin ruta asignada'}</span>
        )}
      </div>

      {canAddExtra && (
        <div className="flex justify-start sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAddExtra}
            className="text-muted-foreground hover:text-primary"
            aria-label={`Agregar parada extra el ${DAY_LABELS[day - 1].toLowerCase()} ${dateLabel}`}
          >
            <Plus data-icon="inline-start" /> Parada extra
          </Button>
        </div>
      )}

      {isOver && dropHint && <DropBadge hint={dropHint} />}
    </li>
  )
}
