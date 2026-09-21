import { DayColumn } from './DayColumn'
import { WEEK_DAYS } from './routes.types'
import type { Route, RouteAssignment } from './routes.types'

interface WeekGridProps {
  assignmentsByDay: Map<number, RouteAssignment[]>
  routesById: Map<string, Route>
  busyAssignmentIds: Set<string>
  onRemove: (assignment: RouteAssignment) => void
}

/** Grilla semanal del vendedor seleccionado (wireframe 1g). Lun-Dom (1-7): el sketch dibuja 6 columnas por espacio, pero el backend acepta los 7 días (route_user_day_check). */
export function WeekGrid({ assignmentsByDay, routesById, busyAssignmentIds, onRemove }: WeekGridProps) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {WEEK_DAYS.map((day) => (
        <DayColumn
          key={day}
          day={day}
          assignments={assignmentsByDay.get(day) ?? []}
          routesById={routesById}
          busyAssignmentIds={busyAssignmentIds}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
