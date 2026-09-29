import { X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Spinner } from '../../components/ui/spinner'
import { routeMeta } from './DraggableRouteCard'
import type { Route } from './routes.types'

interface RouteAssignmentCardProps {
  route: Route | undefined
  busy: boolean
  onRemove: () => void
}

/** Ruta asignada dentro de la fila de un día. */
export function RouteAssignmentCard({ route, busy, onRemove }: RouteAssignmentCardProps) {
  const meta = route ? routeMeta(route) : ''
  return (
    <div className="flex max-w-full min-w-0 items-center gap-1 rounded-lg bg-primary/[0.09] py-1.5 pr-1 pl-3 ring-1 ring-primary/15 ring-inset">
      <div className="min-w-0">
        <p className="truncate text-sm leading-tight font-medium text-foreground">{route?.name ?? 'Ruta'}</p>
        {meta && <p className="truncate text-xs leading-tight text-muted-foreground">{meta}</p>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={busy}
        onClick={onRemove}
        aria-label={`Quitar ${route?.name ?? 'la ruta'} de este día`}
        className="shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
      >
        {busy ? <Spinner /> : <X />}
      </Button>
    </div>
  )
}
