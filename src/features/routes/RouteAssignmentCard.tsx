import { Link } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import { routeMeta } from './DraggableRouteCard'
import type { Route } from './routes.types'

interface RouteAssignmentCardProps {
  route: Route | undefined
  /** `location.state` que recibe la página de paradas para volver a esta misma vista. */
  linkState: unknown
  busy: boolean
  onRemove: () => void
}

/** Ruta asignada dentro de la fila de un día: abre sus paradas; la X quita la asignación. */
export function RouteAssignmentCard({ route, linkState, busy, onRemove }: RouteAssignmentCardProps) {
  const meta = route ? routeMeta(route) : ''
  return (
    <div className="group/chip flex max-w-full min-w-0 items-center rounded-lg bg-primary/[0.09] ring-1 ring-primary/15 ring-inset transition-colors hover:bg-primary/[0.14]">
      {route ? (
        <Link
          to={`/rutas/${route.id}/paradas`}
          state={linkState}
          title="Ver paradas de la ruta"
          className="flex min-w-0 items-center gap-1 rounded-lg py-1.5 pl-3 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-medium text-foreground">{route.name}</p>
            {meta && <p className="truncate text-xs leading-tight text-muted-foreground">{meta}</p>}
          </div>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-primary" />
        </Link>
      ) : (
        <p className="py-1.5 pl-3 pr-1 text-sm font-medium text-foreground">Ruta</p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={busy}
        onClick={onRemove}
        aria-label={`Quitar ${route?.name ?? 'la ruta'} de este día`}
        className="mr-1 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
      >
        {busy ? <Spinner /> : <X />}
      </Button>
    </div>
  )
}
