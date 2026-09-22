import { useDroppable } from '@dnd-kit/core'
import { cn } from '../../lib/utils'
import { RouteAssignmentCard } from './RouteAssignmentCard'
import { DAY_LABELS_SHORT } from './routes.types'
import type { Route, RouteAssignment } from './routes.types'

interface DayColumnProps {
  day: number
  assignments: RouteAssignment[]
  routesById: Map<string, Route>
  busyAssignmentIds: Set<string>
  onRemove: (assignment: RouteAssignment) => void
}

/** Columna de un día de la semana (wireframe 1g): zona de destino para arrastrar una ruta. */
export function DayColumn({ day, assignments, routesById, busyAssignmentIds, onRemove }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}`, data: { day } })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border border-border bg-background',
        isOver && 'ring-2 ring-primary/40 bg-primary/5'
      )}
    >
      <div className="border-b border-border px-2.5 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {DAY_LABELS_SHORT[day - 1]}
      </div>
      <div className="flex min-h-[180px] flex-col gap-2 p-2">
        {assignments.length === 0 ? (
          <p className="p-2 text-center text-xs text-muted-foreground">Soltar una ruta aquí</p>
        ) : (
          assignments.map((assignment) => (
            <RouteAssignmentCard
              key={assignment.id}
              route={routesById.get(assignment.route_id)}
              busy={busyAssignmentIds.has(assignment.id)}
              onRemove={() => onRemove(assignment)}
            />
          ))
        )}
      </div>
    </div>
  )
}
