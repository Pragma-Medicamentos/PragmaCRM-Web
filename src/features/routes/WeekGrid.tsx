import { DayRow } from './DayRow'
import type { DropHint } from './DayRow'
import { parseDay } from '../metrics/metricsDates'
import { WEEK_DAYS } from './routes.types'
import type { Route, RouteAssignment } from './routes.types'
import type { WeekExtraStopsState } from './useWeekExtraStops'
import type { DailyRouteStop } from '../daily-route/dailyRoute.types'

const shortDateFormatter = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' })

interface WeekGridProps {
  /** YYYY-MM-DD de Lunes a Domingo de la semana que se está viendo. */
  weekDates: string[]
  today: string
  assignmentsByDay: Map<number, RouteAssignment[]>
  routesById: Map<string, Route>
  busyAssignmentIds: Set<string>
  extras: WeekExtraStopsState
  busyExtraIds: Set<string>
  linkState: unknown
  dropHintFor: (day: number) => DropHint | null
  onRemove: (assignment: RouteAssignment) => void
  onAddExtra: (date: string) => void
  onRemoveExtra: (stop: DailyRouteStop) => void
}

/** Semana del vendedor seleccionado, un día por fila (Lun-Dom, 1-7: el backend acepta los 7 días). */
export function WeekGrid({
  weekDates,
  today,
  assignmentsByDay,
  routesById,
  busyAssignmentIds,
  extras,
  busyExtraIds,
  linkState,
  dropHintFor,
  onRemove,
  onAddExtra,
  onRemoveExtra,
}: WeekGridProps) {
  return (
    <ol className="divide-y divide-border/70" aria-label="Semana">
      {WEEK_DAYS.map((day) => {
        const date = weekDates[day - 1]
        return (
          <DayRow
            key={day}
            day={day}
            dateLabel={shortDateFormatter.format(parseDay(date)).replace('.', '')}
            isToday={date === today}
            isPast={date < today}
            assignments={assignmentsByDay.get(day) ?? []}
            routesById={routesById}
            busyAssignmentIds={busyAssignmentIds}
            extras={extras.status === 'ready' ? (extras.byDate.get(date) ?? []) : extras.status === 'error' ? [] : null}
            busyExtraIds={busyExtraIds}
            linkState={linkState}
            dropHint={dropHintFor(day)}
            onRemove={onRemove}
            onAddExtra={() => onAddExtra(date)}
            onRemoveExtra={onRemoveExtra}
          />
        )
      })}
    </ol>
  )
}
