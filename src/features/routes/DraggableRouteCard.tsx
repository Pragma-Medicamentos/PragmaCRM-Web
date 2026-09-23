import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { DAY_LABELS_SHORT } from './routes.types'
import type { Route } from './routes.types'

interface DraggableRouteCardProps {
  route: Route
  /** Días (1-7) en los que esta ruta ya está asignada al vendedor seleccionado. */
  assignedDays: number[]
}

/** Tarjeta arrastrable de "rutas guardadas" (wireframe 1g, columna izquierda). */
export function DraggableRouteCard({ route, assignedDays }: DraggableRouteCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: route.id,
    data: { routeId: route.id },
  })

  const note =
    assignedDays.length > 0
      ? `en la semana: ${assignedDays
          .slice()
          .sort((a, b) => a - b)
          .map((day) => DAY_LABELS_SHORT[day - 1])
          .join(', ')}`
      : 'sin asignar esta semana'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'cursor-grab touch-none rounded-lg border border-border bg-background p-2.5 text-sm shadow-sm active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
    >
      <p className="font-medium text-foreground">{route.name}</p>
      {route.zone && <p className="text-xs text-muted-foreground">{route.zone}</p>}
      <p className="mt-1 text-xs text-muted-foreground/80">{note}</p>
      <Link
        to={`/rutas/${route.id}/paradas`}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
      >
        Editar paradas
      </Link>
    </div>
  )
}
