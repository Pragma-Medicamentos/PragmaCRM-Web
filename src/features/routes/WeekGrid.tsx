import { DayRow } from './DayRow'
import type { DropHint } from './DayRow'
import { WEEK_DAYS } from './routes.types'
import type { Route, RouteAssignment } from './routes.types'

interface WeekGridProps {
  assignmentsByDay: Map<number, RouteAssignment[]>
  routesById: Map<string, Route>
  busyAssignmentIds: Set<string>
  today: number
  dropHintFor: (day: number) => DropHint | null
  onRemove: (assignment: RouteAssignment) => void
}

/** Semana del vendedor seleccionado, un día por fila (Lun-Dom, 1-7: el backend acepta los 7 días). */
export function WeekGrid({ assignmentsByDay, routesById, busyAssignmentIds, today, dropHintFor, onRemove }: WeekGridProps) {
  return (
    <ol className="divide-y divide-border/70" aria-label="Semana">
      {WEEK_DAYS.map((day) => (
        <DayRow
          key={day}
          day={day}
          isToday={day === today}
          assignments={assignmentsByDay.get(day) ?? []}
          routesById={routesById}
          busyAssignmentIds={busyAssignmentIds}
          dropHint={dropHintFor(day)}
          onRemove={onRemove}
        />
      ))}
    </ol>
  )
}
