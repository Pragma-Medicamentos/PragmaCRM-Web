import { X } from 'lucide-react'
import { Button } from '../../components/ui/button'
import type { Route } from './routes.types'

interface RouteAssignmentCardProps {
  route: Route | undefined
  busy: boolean
  onRemove: () => void
}

/** Tarjeta de una asignación activa dentro de una columna de día (wireframe 1g). */
export function RouteAssignmentCard({ route, busy, onRemove }: RouteAssignmentCardProps) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-sm">
      <div>
        <p className="font-medium text-foreground">{route?.name ?? 'Ruta'}</p>
        {route?.zone && <p className="text-xs text-muted-foreground">{route.zone}</p>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={busy}
        onClick={onRemove}
        aria-label="Quitar de este día"
      >
        <X />
      </Button>
    </div>
  )
}
