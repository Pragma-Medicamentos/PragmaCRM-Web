import { useDroppable } from '@dnd-kit/core'
import { ArrowRightLeft, Check, CornerDownLeft } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { cn } from '../../lib/utils'
import { RouteAssignmentCard } from './RouteAssignmentCard'
import { DAY_LABELS } from './routes.types'
import type { Route, RouteAssignment } from './routes.types'

export type DropHint = { kind: 'assign' } | { kind: 'reassign'; fromVendor: string } | { kind: 'already' }

interface DayRowProps {
  day: number
  isToday: boolean
  assignments: RouteAssignment[]
  routesById: Map<string, Route>
  busyAssignmentIds: Set<string>
  onRemove: (assignment: RouteAssignment) => void
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

/** Fila de un día de la semana: zona de destino para soltar una ruta. */
export function DayRow({ day, isToday, assignments, routesById, busyAssignmentIds, onRemove, dropHint }: DayRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}`, data: { day } })
  const count = assignments.length

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'relative grid min-h-[4.25rem] grid-cols-1 items-center gap-2 px-4 py-3 sm:gap-3 sm:py-2.5 transition-colors duration-150 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:px-5',
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
          {count === 0 ? 'Libre' : count === 1 ? '1 ruta' : `${count} rutas`}
        </p>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {assignments.map((assignment) => (
          <RouteAssignmentCard
            key={assignment.id}
            route={routesById.get(assignment.route_id)}
            busy={busyAssignmentIds.has(assignment.id)}
            onRemove={() => onRemove(assignment)}
          />
        ))}
        {count === 0 && (
          <span className="text-sm text-muted-foreground">{dropHint ? 'Soltar aquí' : 'Sin ruta asignada'}</span>
        )}
      </div>

      {isOver && dropHint && <DropBadge hint={dropHint} />}
    </li>
  )
}
