import type { ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import { GripVertical, ListOrdered } from 'lucide-react'
import { Button } from '../../components/ui/button'
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

/** Ruta de la lista "Rutas guardadas": se arrastra a un día del tablero. */
export function DraggableRouteCard({ route, coverage }: DraggableRouteCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: route.id,
    data: { routeId: route.id },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="ruta arrastrable"
      className={cn(
        'group flex cursor-grab touch-none items-start gap-2 rounded-xl px-2.5 py-2.5 transition-colors outline-none select-none hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring/60 active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      <RouteSummary
        route={route}
        coverage={coverage}
        action={
          <Button
            asChild
            variant="ghost"
            size="icon-xs"
            className="-mt-0.5 -mr-1 text-muted-foreground hover:text-primary"
          >
            <Link
              to={`/rutas/${route.id}/paradas`}
              aria-label={`Editar paradas de ${route.name}`}
              title="Editar paradas"
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <ListOrdered />
            </Link>
          </Button>
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
