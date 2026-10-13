import { useRef, type ReactNode } from 'react'
import { useDndMonitor, useDraggable } from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, GripVertical } from 'lucide-react'
import { cn } from '../../lib/utils'
import { DAY_LABELS, DAY_LETTERS, WEEK_DAYS } from './routes.types'
import type { Route } from './routes.types'

export type DayCoverage = { kind: 'mine' } | { kind: 'other'; vendorName: string } | { kind: 'free' }

export function routeMeta(route: Route): string {
  return [route.zone, route.municipality].filter(Boolean).join(' · ')
}

function coverageSummary(coverage: DayCoverage[]): string {
  const mine = WEEK_DAYS.filter((day) => coverage[day - 1].kind === 'mine').map((day) => DAY_LABELS[day - 1])
  const others = WEEK_DAYS.flatMap((day) => {
    const c = coverage[day - 1]
    return c.kind === 'other' ? [`${DAY_LABELS[day - 1]} (${c.vendorName})`] : []
  })
  const parts = [
    mine.length ? `Con este vendedor: ${mine.join(', ')}` : 'Sin días con este vendedor',
    others.length ? `Con otros: ${others.join(', ')}` : null,
  ]
  return parts.filter(Boolean).join('. ')
}

function WeekStrip({ coverage }: { coverage: DayCoverage[] }) {
  return (
    <div role="img" aria-label={coverageSummary(coverage)} className="flex gap-1">
      {WEEK_DAYS.map((day) => {
        const c = coverage[day - 1]
        return (
          <span
            key={day}
            title={
              c.kind === 'mine'
                ? `${DAY_LABELS[day - 1]}: este vendedor`
                : c.kind === 'other'
                  ? `${DAY_LABELS[day - 1]}: ${c.vendorName}`
                  : `${DAY_LABELS[day - 1]}: libre`
            }
            className={cn(
              'grid size-[1.375rem] place-items-center rounded-md text-[0.6875rem] leading-none font-semibold',
              c.kind === 'mine' && 'bg-primary text-primary-foreground',
              c.kind === 'other' && 'bg-foreground/10 text-foreground/60',
              c.kind === 'free' && 'text-muted-foreground/70 ring-1 ring-border ring-inset'
            )}
          >
            {DAY_LETTERS[day - 1]}
          </span>
        )
      })}
    </div>
  )
}

interface RouteSummaryProps {
  route: Route
  coverage: DayCoverage[]
  action?: ReactNode
}

function RouteSummary({ route, coverage, action }: RouteSummaryProps) {
  const meta = routeMeta(route)
  return (
    <>
      <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{route.name}</p>
            {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
          </div>
          {action}
        </div>
        <div className="mt-2.5">
          <WeekStrip coverage={coverage} />
        </div>
      </div>
    </>
  )
}

interface DraggableRouteCardProps {
  route: Route
  coverage: DayCoverage[]
}

interface OpenableRouteCardProps extends DraggableRouteCardProps {
  /** `location.state` que recibe la página de paradas para volver a esta misma vista. */
  linkState: unknown
}

/**
 * Ruta de la lista "Rutas guardadas". Clic o Enter abren sus paradas; arrastrarla
 * (o Espacio con el teclado) la asigna a un día del tablero.
 */
export function DraggableRouteCard({ route, coverage, linkState }: OpenableRouteCardProps) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: route.id,
    data: { routeId: route.id },
  })

  // Soltar la ruta sobre sí misma dispara un click al final del arrastre: no debe abrirla.
  const draggedRef = useRef(false)
  useDndMonitor({
    onDragStart: ({ active }) => {
      if (active.id === route.id) draggedRef.current = true
    },
  })

  const open = () => navigate(`/rutas/${route.id}/paradas`, { state: linkState })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="ruta arrastrable"
      title="Clic para ver paradas · arrastra para asignar"
      onPointerDown={(e) => {
        draggedRef.current = false
        listeners?.onPointerDown?.(e)
      }}
      onClick={() => {
        if (draggedRef.current) return
        open()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isDragging) {
          e.preventDefault()
          open()
          return
        }
        listeners?.onKeyDown?.(e)
      }}
      className={cn(
        'group flex cursor-pointer touch-none items-start gap-2 rounded-xl px-2.5 py-2.5 transition-colors outline-none select-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/60 active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      <RouteSummary
        route={route}
        coverage={coverage}
        action={
          <ChevronRight
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-primary"
          />
        }
      />
    </div>
  )
}

/** Lo que sigue al cursor mientras se arrastra (DragOverlay): no se recorta con el scroll de la lista. */
export function RouteDragPreview({ route, coverage }: DraggableRouteCardProps) {
  return (
    <div className="group flex w-[18rem] cursor-grabbing items-start gap-2 rounded-xl bg-card px-2.5 py-2.5 shadow-float ring-1 ring-primary/30">
      <RouteSummary route={route} coverage={coverage} />
    </div>
  )
}
